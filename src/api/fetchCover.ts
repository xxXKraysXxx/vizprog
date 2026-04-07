export async function fetchCover(isbn: string): Promise<Blob | null> {
  try {
    const url = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;

    const res = await fetch(url);

    if (!res.ok) {
      console.warn("Нет обложки для ISBN:", isbn);
      return null;
    }

    return await res.blob();
  } catch (err) {
    console.error("Ошибка загрузки обложки:", err);
    return null;
  }
}
