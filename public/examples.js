// Buggy starter programs for demos. Each one has a classic beginner bug.
window.QUACK_EXAMPLES = [
  {
    id: "average",
    title: "📊 Grade average is wrong",
    language: "python",
    output: "Expected average: 85.0\nActual output:   Average: 83.33333333333333",
    codeByLanguage: {
      python: `def average(grades):\n    total = 0\n    for i in range(1, len(grades)):\n        total += grades[i]\n    return total / len(grades)\n\nscores = [90, 80, 85]\nprint("Average:", average(scores))`,
      javascript: `function average(grades) {\n  let total = 0;\n  for (let i = 1; i < grades.length; i++) total += grades[i];\n  return total / grades.length;\n}\nconst scores = [90, 80, 85];\nconsole.log("Average:", average(scores));`,
      typescript: `function average(grades: number[]): number {\n  let total = 0;\n  for (let i = 1; i < grades.length; i++) total += grades[i];\n  return total / grades.length;\n}\nconsole.log(average([90, 80, 85]));`,
      java: `import java.util.*;\nclass Main {\n  static double average(List<Integer> grades) {\n    int total = 0;\n    for (int i = 1; i < grades.size(); i++) total += grades.get(i);\n    return (double) total / grades.size();\n  }\n  public static void main(String[] args) { System.out.println(average(Arrays.asList(90, 80, 85))); }\n}`,
      cpp: `#include <iostream>\n#include <vector>\nusing namespace std;\ndouble average(vector<int> grades) {\n  int total = 0;\n  for (int i = 1; i < grades.size(); i++) total += grades[i];\n  return (double)total / grades.size();\n}\nint main() { cout << average({90, 80, 85}) << endl; }`,
      c: `#include <stdio.h>\ndouble average(int grades[], int count) {\n  int total = 0;\n  for (int i = 1; i < count; i++) total += grades[i];\n  return (double)total / count;\n}\nint main(void) { int g[] = {90, 80, 85}; printf("%f\\n", average(g, 3)); }`,
      csharp: `using System;\nclass Program {\n  static double Average(int[] grades) {\n    int total = 0;\n    for (int i = 1; i < grades.Length; i++) total += grades[i];\n    return (double)total / grades.Length;\n  }\n  static void Main() => Console.WriteLine(Average(new[] { 90, 80, 85 }));\n}`,
      go: `package main\nimport "fmt"\nfunc average(g []int) float64 {\n total := 0\n for i := 1; i < len(g); i++ { total += g[i] }\n return float64(total) / float64(len(g))\n}\nfunc main() { fmt.Println(average([]int{90, 80, 85})) }`,
      rust: `fn average(g: &[i32]) -> f64 {\n let mut total = 0;\n for i in 1..g.len() { total += g[i]; }\n total as f64 / g.len() as f64\n}\nfn main() { println!("{}", average(&[90, 80, 85])); }`,
      html: `<!doctype html>\n<p id="result"></p>\n<script>\nconst grades = [90, 80, 85];\nlet total = 0;\nfor (let i = 1; i < grades.length; i++) total += grades[i];\ndocument.querySelector("#result").textContent = total / grades.length;\n</script>`,
      plaintext: `average(grades):\n  total = 0\n  for i from 1 to grades.length - 1: total += grades[i]\n  return total / grades.length\n\nprint average([90, 80, 85])`,
    },
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

// ---------------------------------------------------------------------- //
// Every demo is available in every language. Each translation keeps the
// SAME bug and the SAME symptom as the original example.
// ---------------------------------------------------------------------- //
(function () {
  const T = {
    cart: {
      javascript: `const sharedCart = [];\nfunction addToCart(item, cart = sharedCart) {\n  cart.push(item);\n  return cart;\n}\n\nconst alice = addToCart("apple");\nconst bob = addToCart("bread");\nconsole.log("Alice's cart:", alice);\nconsole.log("Bob's cart:  ", bob);\n`,
      typescript: `const sharedCart: string[] = [];\nfunction addToCart(item: string, cart: string[] = sharedCart): string[] {\n  cart.push(item);\n  return cart;\n}\n\nconst alice = addToCart("apple");\nconst bob = addToCart("bread");\nconsole.log("Alice's cart:", alice);\nconsole.log("Bob's cart:  ", bob);\n`,
      java: `import java.util.*;\nclass Main {\n  static List<String> sharedCart = new ArrayList<>();\n  static List<String> addToCart(String item) {\n    sharedCart.add(item);\n    return sharedCart;\n  }\n  public static void main(String[] args) {\n    List<String> alice = addToCart("apple");\n    List<String> bob = addToCart("bread");\n    System.out.println("Alice's cart: " + alice);\n    System.out.println("Bob's cart:   " + bob);\n  }\n}\n`,
      cpp: `#include <iostream>\n#include <string>\n#include <vector>\nusing namespace std;\n\nvector<string>& addToCart(const string& item) {\n  static vector<string> cart;  // one cart shared by every call\n  cart.push_back(item);\n  return cart;\n}\n\nvoid show(const char* label, const vector<string>& c) {\n  cout << label;\n  for (auto& s : c) cout << s << " ";\n  cout << endl;\n}\n\nint main() {\n  auto& alice = addToCart("apple");\n  auto& bob = addToCart("bread");\n  show("Alice's cart: ", alice);\n  show("Bob's cart:   ", bob);\n}\n`,
      c: `#include <stdio.h>\n#include <string.h>\n\nstatic const char *shared_cart[10];  // one cart shared by every call\nstatic int shared_count = 0;\n\nconst char **add_to_cart(const char *item) {\n  shared_cart[shared_count++] = item;\n  return shared_cart;\n}\n\nint main(void) {\n  const char **alice = add_to_cart("apple");\n  const char **bob = add_to_cart("bread");\n  printf("Alice's cart:");\n  for (int i = 0; i < shared_count; i++) printf(" %s", alice[i]);\n  printf("\\nBob's cart:  ");\n  for (int i = 0; i < shared_count; i++) printf(" %s", bob[i]);\n  printf("\\n");\n}\n`,
      csharp: `using System;\nusing System.Collections.Generic;\nclass Program {\n  static List<string> sharedCart = new List<string>();\n  static List<string> AddToCart(string item) {\n    sharedCart.Add(item);\n    return sharedCart;\n  }\n  static void Main() {\n    var alice = AddToCart("apple");\n    var bob = AddToCart("bread");\n    Console.WriteLine("Alice's cart: " + string.Join(", ", alice));\n    Console.WriteLine("Bob's cart:   " + string.Join(", ", bob));\n  }\n}\n`,
      go: `package main\n\nimport "fmt"\n\nvar sharedCart []string\n\nfunc addToCart(item string) *[]string {\n\tsharedCart = append(sharedCart, item)\n\treturn &sharedCart\n}\n\nfunc main() {\n\talice := addToCart("apple")\n\tbob := addToCart("bread")\n\tfmt.Println("Alice's cart:", *alice)\n\tfmt.Println("Bob's cart:  ", *bob)\n}\n`,
      rust: `use std::cell::RefCell;\nuse std::rc::Rc;\n\nfn add_to_cart(item: &str, cart: &Rc<RefCell<Vec<String>>>) -> Rc<RefCell<Vec<String>>> {\n    cart.borrow_mut().push(item.to_string());\n    Rc::clone(cart)\n}\n\nfn main() {\n    let shared_cart = Rc::new(RefCell::new(Vec::new()));\n    let alice = add_to_cart("apple", &shared_cart);\n    let bob = add_to_cart("bread", &shared_cart);\n    println!("Alice's cart: {:?}", alice.borrow());\n    println!("Bob's cart:   {:?}", bob.borrow());\n}\n`,
      html: `<!doctype html>\n<pre id="out"></pre>\n<script>\nconst sharedCart = [];\nfunction addToCart(item, cart = sharedCart) {\n  cart.push(item);\n  return cart;\n}\nconst alice = addToCart("apple");\nconst bob = addToCart("bread");\ndocument.querySelector("#out").textContent =\n  "Alice's cart: " + JSON.stringify(alice) + "\\nBob's cart:   " + JSON.stringify(bob);\n</script>`,
      plaintext: `shared_cart = empty list\n\nadd_to_cart(item):\n  append item to shared_cart\n  return shared_cart\n\nalice = add_to_cart("apple")\nbob = add_to_cart("bread")\nprint alice\nprint bob`,
    },
    timers: {
      python: `import time\n\ndef start_countdown():\n    callbacks = []\n    i = 0\n    while i < 3:\n        callbacks.append(lambda: print(i))\n        i += 1\n    for cb in callbacks:\n        time.sleep(1)\n        cb()\n\nstart_countdown()\n`,
      typescript: `function startCountdown(): void {\n  for (var i = 0; i < 3; i++) {\n    setTimeout(function () {\n      console.log(i);\n    }, 1000 * i);\n  }\n}\n\nstartCountdown();\n`,
      java: `import java.util.*;\nclass Main {\n  public static void main(String[] args) {\n    int[] i = {0};  // one counter shared by every task\n    List<Runnable> tasks = new ArrayList<>();\n    for (i[0] = 0; i[0] < 3; i[0]++) {\n      tasks.add(() -> System.out.println(i[0]));\n    }\n    for (Runnable t : tasks) t.run();\n  }\n}\n`,
      cpp: `#include <functional>\n#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n  int i;\n  vector<function<void()>> tasks;\n  for (i = 0; i < 3; i++) {\n    tasks.push_back([&]() { cout << i << endl; });\n  }\n  for (auto& t : tasks) t();\n}\n`,
      c: `#include <stdio.h>\n\nint main(void) {\n  int i;\n  int *tasks[3];\n  for (i = 0; i < 3; i++) {\n    tasks[i] = &i;  // every "task" points at the same variable\n  }\n  for (int t = 0; t < 3; t++) printf("%d\\n", *tasks[t]);\n}\n`,
      csharp: `using System;\nusing System.Collections.Generic;\nclass Program {\n  static void Main() {\n    int i;\n    var tasks = new List<Action>();\n    for (i = 0; i < 3; i++) {\n      tasks.Add(() => Console.WriteLine(i));\n    }\n    foreach (var t in tasks) t();\n  }\n}\n`,
      go: `package main\n\nimport "fmt"\n\nfunc main() {\n\tvar i int\n\tvar tasks []func()\n\tfor i = 0; i < 3; i++ {\n\t\ttasks = append(tasks, func() { fmt.Println(i) })\n\t}\n\tfor _, t := range tasks {\n\t\tt()\n\t}\n}\n`,
      rust: `use std::cell::Cell;\nuse std::rc::Rc;\n\nfn main() {\n    let i = Rc::new(Cell::new(0));\n    let mut tasks: Vec<Box<dyn Fn()>> = Vec::new();\n    while i.get() < 3 {\n        let shared = Rc::clone(&i);\n        tasks.push(Box::new(move || println!("{}", shared.get())));\n        i.set(i.get() + 1);\n    }\n    for t in &tasks {\n        t();\n    }\n}\n`,
      html: `<!doctype html>\n<pre id="out"></pre>\n<script>\nfor (var i = 0; i < 3; i++) {\n  setTimeout(function () {\n    document.querySelector("#out").textContent += i + "\\n";\n  }, 1000 * i);\n}\n</script>`,
      plaintext: `i = 0\nwhile i < 3:\n  remember a task: "print i"\n  i = i + 1\n\nrun every remembered task`,
    },
    async: {
      python: `import asyncio\n\nasync def get_likes(post_id):\n    await asyncio.sleep(0.1)\n    return {1: 10, 2: 12, 3: 20}[post_id]\n\nasync def total_likes(post_ids):\n    total = 0\n\n    async def add(post_id):\n        nonlocal total\n        total += await get_likes(post_id)\n\n    for post_id in post_ids:\n        asyncio.create_task(add(post_id))\n    return total\n\nprint("Total likes:", asyncio.run(total_likes([1, 2, 3])))\n`,
      typescript: `async function getLikes(postId: number): Promise<number> {\n  const res = await fetch("https://api.example.com/posts/" + postId);\n  const post = await res.json();\n  return post.likes;\n}\n\nasync function totalLikes(postIds: number[]): Promise<number> {\n  let total = 0;\n  postIds.forEach(async (id) => {\n    total += await getLikes(id);\n  });\n  return total;\n}\n\ntotalLikes([1, 2, 3]).then((t) => console.log("Total likes:", t));\n`,
      java: `import java.util.*;\nimport java.util.concurrent.*;\nimport java.util.concurrent.atomic.AtomicInteger;\n\nclass Main {\n  static CompletableFuture<Integer> getLikes(int id) {\n    return CompletableFuture.supplyAsync(() -> {\n      try { Thread.sleep(100); } catch (InterruptedException e) {}\n      return id * 14;\n    });\n  }\n\n  static int totalLikes(List<Integer> ids) {\n    AtomicInteger total = new AtomicInteger();\n    for (int id : ids) {\n      getLikes(id).thenAccept(total::addAndGet);\n    }\n    return total.get();\n  }\n\n  public static void main(String[] args) {\n    System.out.println("Total likes: " + totalLikes(List.of(1, 2, 3)));\n  }\n}\n`,
      cpp: `#include <atomic>\n#include <chrono>\n#include <iostream>\n#include <thread>\n#include <vector>\nusing namespace std;\n\nint getLikes(int id) {\n  this_thread::sleep_for(chrono::milliseconds(100));\n  return id * 14;\n}\n\nint totalLikes(const vector<int>& ids) {\n  static atomic<int> total{0};\n  total = 0;\n  for (int id : ids) {\n    thread([id]() { total += getLikes(id); }).detach();\n  }\n  return total;\n}\n\nint main() {\n  cout << "Total likes: " << totalLikes({1, 2, 3}) << endl;\n}\n`,
      c: `#include <pthread.h>\n#include <stdio.h>\n#include <unistd.h>\n\nstatic int total = 0;\n\nvoid *add_likes(void *arg) {\n  usleep(100000);\n  total += *(int *)arg * 14;\n  return NULL;\n}\n\nint main(void) {\n  static int ids[] = {1, 2, 3};\n  pthread_t threads[3];\n  for (int i = 0; i < 3; i++) pthread_create(&threads[i], NULL, add_likes, &ids[i]);\n  printf("Total likes: %d\\n", total);\n}\n`,
      csharp: `using System;\nusing System.Collections.Generic;\nusing System.Threading.Tasks;\nclass Program {\n  static async Task<int> GetLikes(int id) {\n    await Task.Delay(100);\n    return id * 14;\n  }\n\n  static async Task<int> TotalLikes(List<int> ids) {\n    int total = 0;\n    ids.ForEach(async id => {\n      total += await GetLikes(id);\n    });\n    return total;\n  }\n\n  static async Task Main() {\n    Console.WriteLine("Total likes: " + await TotalLikes(new List<int> { 1, 2, 3 }));\n  }\n}\n`,
      go: `package main\n\nimport (\n\t"fmt"\n\t"time"\n)\n\nfunc getLikes(id int) int {\n\ttime.Sleep(100 * time.Millisecond)\n\treturn id * 14\n}\n\nfunc totalLikes(ids []int) int {\n\ttotal := 0\n\tfor _, id := range ids {\n\t\tgo func(id int) {\n\t\t\ttotal += getLikes(id)\n\t\t}(id)\n\t}\n\treturn total\n}\n\nfunc main() {\n\tfmt.Println("Total likes:", totalLikes([]int{1, 2, 3}))\n}\n`,
      rust: `use std::sync::{Arc, Mutex};\nuse std::thread;\nuse std::time::Duration;\n\nfn get_likes(id: i32) -> i32 {\n    thread::sleep(Duration::from_millis(100));\n    id * 14\n}\n\nfn total_likes(ids: &[i32]) -> i32 {\n    let total = Arc::new(Mutex::new(0));\n    for &id in ids {\n        let total = Arc::clone(&total);\n        thread::spawn(move || {\n            *total.lock().unwrap() += get_likes(id);\n        });\n    }\n    let result = *total.lock().unwrap();\n    result\n}\n\nfn main() {\n    println!("Total likes: {}", total_likes(&[1, 2, 3]));\n}\n`,
      html: `<!doctype html>\n<p id="result"></p>\n<script>\nasync function getLikes(id) {\n  await new Promise((r) => setTimeout(r, 100));\n  return id * 14;\n}\nasync function totalLikes(ids) {\n  let total = 0;\n  ids.forEach(async (id) => {\n    total += await getLikes(id);\n  });\n  return total;\n}\ntotalLikes([1, 2, 3]).then((t) => {\n  document.querySelector("#result").textContent = "Total likes: " + t;\n});\n</script>`,
      plaintext: `total_likes(post_ids):\n  total = 0\n  for each id in post_ids:\n    start in background: total += get_likes(id)   // takes time\n  return total        // returns immediately\n\nprint "Total likes:", total_likes([1, 2, 3])`,
    },
    search: {
      javascript: `function binarySearch(items, target) {\n  let low = 0;\n  let high = items.length - 1;\n  while (low <= high) {\n    const mid = Math.floor((low + high) / 2);\n    if (items[mid] === target) return mid;\n    else if (items[mid] < target) low = mid;\n    else high = mid - 1;\n  }\n  return -1;\n}\n\nconsole.log(binarySearch([1, 3, 5, 7, 9], 9));\n`,
      typescript: `function binarySearch(items: number[], target: number): number {\n  let low = 0;\n  let high = items.length - 1;\n  while (low <= high) {\n    const mid = Math.floor((low + high) / 2);\n    if (items[mid] === target) return mid;\n    else if (items[mid] < target) low = mid;\n    else high = mid - 1;\n  }\n  return -1;\n}\n\nconsole.log(binarySearch([1, 3, 5, 7, 9], 9));\n`,
      java: `class Main {\n  static int binarySearch(int[] items, int target) {\n    int low = 0, high = items.length - 1;\n    while (low <= high) {\n      int mid = (low + high) / 2;\n      if (items[mid] == target) return mid;\n      else if (items[mid] < target) low = mid;\n      else high = mid - 1;\n    }\n    return -1;\n  }\n  public static void main(String[] args) {\n    System.out.println(binarySearch(new int[]{1, 3, 5, 7, 9}, 9));\n  }\n}\n`,
      cpp: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint binarySearch(const vector<int>& items, int target) {\n  int low = 0, high = (int)items.size() - 1;\n  while (low <= high) {\n    int mid = (low + high) / 2;\n    if (items[mid] == target) return mid;\n    else if (items[mid] < target) low = mid;\n    else high = mid - 1;\n  }\n  return -1;\n}\n\nint main() { cout << binarySearch({1, 3, 5, 7, 9}, 9) << endl; }\n`,
      c: `#include <stdio.h>\n\nint binary_search(int items[], int count, int target) {\n  int low = 0, high = count - 1;\n  while (low <= high) {\n    int mid = (low + high) / 2;\n    if (items[mid] == target) return mid;\n    else if (items[mid] < target) low = mid;\n    else high = mid - 1;\n  }\n  return -1;\n}\n\nint main(void) {\n  int items[] = {1, 3, 5, 7, 9};\n  printf("%d\\n", binary_search(items, 5, 9));\n}\n`,
      csharp: `using System;\nclass Program {\n  static int BinarySearch(int[] items, int target) {\n    int low = 0, high = items.Length - 1;\n    while (low <= high) {\n      int mid = (low + high) / 2;\n      if (items[mid] == target) return mid;\n      else if (items[mid] < target) low = mid;\n      else high = mid - 1;\n    }\n    return -1;\n  }\n  static void Main() => Console.WriteLine(BinarySearch(new[] { 1, 3, 5, 7, 9 }, 9));\n}\n`,
      go: `package main\n\nimport "fmt"\n\nfunc binarySearch(items []int, target int) int {\n\tlow, high := 0, len(items)-1\n\tfor low <= high {\n\t\tmid := (low + high) / 2\n\t\tif items[mid] == target {\n\t\t\treturn mid\n\t\t} else if items[mid] < target {\n\t\t\tlow = mid\n\t\t} else {\n\t\t\thigh = mid - 1\n\t\t}\n\t}\n\treturn -1\n}\n\nfunc main() { fmt.Println(binarySearch([]int{1, 3, 5, 7, 9}, 9)) }\n`,
      rust: `fn binary_search(items: &[i32], target: i32) -> i32 {\n    let mut low: i32 = 0;\n    let mut high: i32 = items.len() as i32 - 1;\n    while low <= high {\n        let mid = (low + high) / 2;\n        if items[mid as usize] == target {\n            return mid;\n        } else if items[mid as usize] < target {\n            low = mid;\n        } else {\n            high = mid - 1;\n        }\n    }\n    -1\n}\n\nfn main() {\n    println!("{}", binary_search(&[1, 3, 5, 7, 9], 9));\n}\n`,
      html: `<!doctype html>\n<p id="result"></p>\n<script>\nfunction binarySearch(items, target) {\n  let low = 0, high = items.length - 1;\n  while (low <= high) {\n    const mid = Math.floor((low + high) / 2);\n    if (items[mid] === target) return mid;\n    else if (items[mid] < target) low = mid;\n    else high = mid - 1;\n  }\n  return -1;\n}\ndocument.querySelector("#result").textContent = binarySearch([1, 3, 5, 7, 9], 9);\n</script>`,
      plaintext: `binary_search(items, target):\n  low = 0\n  high = length(items) - 1\n  while low <= high:\n    mid = floor((low + high) / 2)\n    if items[mid] == target: return mid\n    else if items[mid] < target: low = mid\n    else: high = mid - 1\n  return -1\n\nprint binary_search([1, 3, 5, 7, 9], 9)`,
    },
  };
  for (const ex of window.QUACK_EXAMPLES) {
    ex.codeByLanguage = Object.assign({}, T[ex.id] || {}, ex.codeByLanguage || {});
    // The original code is the canonical version in its own language.
    ex.codeByLanguage[ex.language] = ex.code;
  }
})();
