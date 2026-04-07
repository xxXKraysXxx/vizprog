import React, { useEffect, useState } from "react";
import { fetchBooks } from "./api/fetchBooks";
import { fetchCover } from "./api/fetchCover";
import { BookCard } from "./components/BookCard";

export const App = () => {
  const [books, setBooks] = useState<any[]>([]);
  const [covers, setCovers] = useState<Record<string, Blob | null | undefined>>({});

  useEffect(() => {
    async function load() {
      const list = await fetchBooks();
      setBooks(list);

      const initial: Record<string, undefined> = {};
      list.forEach((b: { id: string | number }) => {
  initial[b.id] = undefined;
});

      setCovers(initial);

      const coverMap: Record<string, Blob | null> = {};

      for (const book of list) {
        coverMap[book.id] = await fetchCover(book.isbn);
        setCovers((prev) => ({ ...prev, [book.id]: coverMap[book.id] }));
      }
    }

    load();
  }, []);

  return (
    <div style={styles.grid}>
      {books.map((book) => (
        <BookCard
          key={book.id}
          title={book.title}
          authors={book.authors}
          cover={covers[book.id]}
        />
      ))}
    </div>
  );
};

const styles = {
  grid: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 20
  }
};
