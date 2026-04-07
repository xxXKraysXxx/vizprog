export async function fetchBooks() {
  const res = await fetch("https://fakeapi.extendsclass.com/books");
  return res.json();
}
