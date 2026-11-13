"""Tests for the "never give the answer" guardrail.  Run: python -m unittest -v"""

import unittest

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

if __name__ == "__main__":
    unittest.main()
