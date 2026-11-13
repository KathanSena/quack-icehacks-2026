"""Tests for the "never give the answer" guardrail.  Run: python -m unittest -v"""

import os
import unittest
from unittest import mock

import duck_brain

from duck_brain import _clean_focus, _history_contents, check_reply, number_lines

CODE = """def average(grades):
    total = 0
    for i in range(1, len(grades)):
        total += grades[i]
    return total / len(grades)
"""


class GuardrailTests(unittest.TestCase):
    def assertSafe(self, reply, phase="narrow"):
        self.assertEqual(check_reply(reply, phase, CODE), [], reply)

    def assertBlocked(self, reply, phase="narrow"):
        self.assertNotEqual(check_reply(reply, phase, CODE), [], reply)

    # --- good Socratic replies ------------------------------------------------
    def test_plain_question_is_safe(self):
        self.assertSafe("What do you expect the average of 90, 80 and 85 to be?")

    def test_referencing_existing_code_is_safe(self):
        self.assertSafe("On line 3, what is the very first value of `i` when the loop runs?")
        self.assertSafe("What does `range(1, len(grades))` produce for a list of three grades?")
        self.assertSafe("After the loop, how many grades were added into `total += grades[i]`?")

    def test_celebrate_without_question_is_safe(self):
        self.assertSafe("Nice work, you found it yourself!", phase="celebrate")

    # --- leaks the guardrail must catch ------------------------------------------
    def test_code_block_blocked(self):
        self.assertBlocked("Here you go:\n```python\nfor i in range(len(grades)):\n```\nDoes that help?")

    def test_new_code_in_backticks_blocked(self):
        self.assertBlocked("What if the loop used `range(0, len(grades))`?")

    def test_new_expression_blocked(self):
        self.assertBlocked("What happens if you set i = 0 at the start?")

    def test_direct_instructions_blocked(self):
        self.assertBlocked("Change the 1 to a 0 in the range. Does it work now?")
        self.assertBlocked("The bug is that your loop skips the first grade, right?")
        self.assertBlocked("You should use range(len(grades)) here, see?")
        self.assertBlocked("Try changing the start of the range?")
        self.assertBlocked("Why not use enumerate instead of range?")

    def test_must_ask_a_question(self):
        self.assertBlocked("Look at line 3 carefully.")

    def test_too_long_blocked(self):
        self.assertBlocked(("word " * 70) + "?")


class HelperTests(unittest.TestCase):
    def test_clean_focus(self):
        self.assertEqual(_clean_focus([3], CODE), [3, 3])
        self.assertEqual(_clean_focus([4, 2], CODE), [2, 4])
        self.assertEqual(_clean_focus([0, 99], CODE), [1, 5])
        self.assertEqual(_clean_focus([], CODE), [])

    def test_history_starts_with_user_and_alternates(self):
        contents = _history_contents([
            {"role": "duck", "text": "Hi!"},
            {"role": "student", "text": "a"},
            {"role": "student", "text": "b"},
            {"role": "duck", "text": "Q?"},
        ])
        self.assertEqual([c["role"] for c in contents], ["user", "model"])
        self.assertIn("a\nb", contents[0]["parts"][0]["text"])

    def test_number_lines(self):
        self.assertTrue(number_lines("x\ny").startswith("1| x"))



class TtsTests(unittest.TestCase):
    def test_clean_text_strips_backticks_and_limits_length(self):
        out = duck_brain.clean_tts_text("What is `i`  on\nline 3? " + "x" * 2000)
        self.assertNotIn("`", out)
        self.assertNotIn("\n", out)
        self.assertLessEqual(len(out), duck_brain.MAX_TTS_CHARS)

    def test_request_shapes(self):
        body = duck_brain.build_tts_body("Hi")
        self.assertEqual(body["generationConfig"]["responseModalities"], ["AUDIO"])
        part = body["contents"][0]["parts"][0]
        self.assertEqual(part["text"], "Hi")
        self.assertIn("speechMetadata", part)
        voice = body["generationConfig"]["speechConfig"]["voiceConfig"]
        self.assertIn("prebuiltVoiceConfig", voice)
        self.assertTrue(voice["prebuiltVoiceConfig"]["voiceName"])

    def test_pcm_is_wrapped_as_wav(self):
        wav = duck_brain._wav_from_pcm(b"\x00\x01" * 100)
        self.assertEqual(wav[:4], b"RIFF")
        self.assertEqual(wav[8:12], b"WAVE")

    def test_requires_key(self):
        with mock.patch.dict(os.environ, {"GEMINI_API_KEY": ""}):
            with self.assertRaises(ValueError):
                duck_brain.tts({"text": "hello"})

    def test_tts_returns_wav_from_raw_pcm(self):
        import base64, io, json
        pcm = base64.b64encode(b"\x00\x01" * 50).decode()
        body = json.dumps({"candidates": [{"content": {"parts": [{"inlineData": {"mimeType": "audio/L16;rate=24000", "data": pcm}}]}}]})
        resp = io.BytesIO(body.encode())
        resp.__enter__ = lambda s: s
        resp.__exit__ = lambda *a: None
        with mock.patch.dict(os.environ, {"GEMINI_API_KEY": "k"}), mock.patch("urllib.request.urlopen", return_value=resp):
            out = duck_brain.tts({"text": "hello"})
        self.assertEqual(out["mime"], "audio/wav")
        self.assertEqual(base64.b64decode(out["audio"])[:4], b"RIFF")


if __name__ == "__main__":
    unittest.main()
