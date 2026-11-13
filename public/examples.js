// Buggy starter programs for demos. Each one has a classic beginner bug.
window.QUACK_EXAMPLES = [
  {
    id: "average",
    title: "📊 Grade average is wrong",
    language: "python",
    output: "Expected average: 85.0\nActual output:   Average: 83.33333333333333",
    code: `def average(grades):
    total = 0
    for i in range(1, len(grades)):
        total += grades[i]
    return total / len(grades)


scores = [90, 80, 85]
print("Average:", average(scores))
`,
  },
  {
    id: "cart",
    title: "🛒 Shopping carts are shared",
    language: "python",
    output: "Alice's cart: ['apple']\nBob's cart:   ['apple', 'bread']   <-- Bob never added an apple!",
    code: `def add_to_cart(item, cart=[]):
    cart.append(item)
    return cart


alice = add_to_cart("apple")
bob = add_to_cart("bread")

print("Alice's cart:", alice)
print("Bob's cart:  ", bob)
`,
  },
  {
    id: "timers",
    title: "⏱️ Countdown prints 3, 3, 3",
    language: "javascript",
    output: "Expected: 0, 1, 2\nActual:   3, 3, 3",
    code: `function startCountdown() {
  for (var i = 0; i < 3; i++) {
    setTimeout(function () {
      console.log(i);
    }, 1000 * i);
  }
}

startCountdown();
`,
  },
  {
    id: "async",
    title: "🌐 Total is always 0",
    language: "javascript",
    output: "Expected: Total likes: 42\nActual:   Total likes: 0",
    code: `async function getLikes(postId) {
  const res = await fetch("https://api.example.com/posts/" + postId);
  const post = await res.json();
  return post.likes;
}

async function totalLikes(postIds) {
  let total = 0;
  postIds.forEach(async (id) => {
    total += await getLikes(id);
  });
  return total;
}

totalLikes([1, 2, 3]).then((t) => console.log("Total likes:", t));
`,
  },
  {
    id: "search",
    title: "🔍 Binary search never ends",
    language: "python",
    output: "The program freezes when searching for 9 (no output, have to press Ctrl+C).",
    code: `def binary_search(items, target):
    low = 0
    high = len(items) - 1
    while low <= high:
        mid = (low + high) // 2
        if items[mid] == target:
            return mid
        elif items[mid] < target:
            low = mid
        else:
            high = mid - 1
    return -1


print(binary_search([1, 3, 5, 7, 9], 9))
`,
  },
  {
    id: "blank",
    title: "✍️ Blank — paste your own code",
    language: "python",
    output: "",
    code: `# Paste your buggy code here, then tell the duck what's wrong.
`,
  },
];
