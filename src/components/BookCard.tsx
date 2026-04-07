import React from "react";

type BookCardProps = {
  title: string;
  authors: string[];
  cover: Blob | null | undefined; // undefined = loading
};

export const BookCard: React.FC<BookCardProps> = ({ title, authors, cover }) => {
  let imageUrl: string;

  if (cover === undefined) {
    imageUrl = "";
  } else if (cover === null) {
    imageUrl = "/no-cover.webm";
  } else {
    imageUrl = URL.createObjectURL(cover);
  }

  return (
    <div style={styles.card}>
      {cover === undefined ? (
        <div style={styles.loading}>Loading...</div>
      ) : (
        <img src={imageUrl} alt={title} style={styles.image} />
      )}

      <h3 style={styles.title}>{title}</h3>
      <p style={styles.authors}>{authors.join(", ")}</p>
    </div>
  );
};

const styles = {
  card: {
    width: 200,
    padding: 12,
    borderRadius: 8,
    border: "1px solid #ccc",
    display: "flex",
    flexDirection: "column" as const,
    gap: 8
  },
  image: {
    width: "100%",
    height: 260,
    objectFit: "cover" as const,
    borderRadius: 4,
    background: "#eee"
  },
  loading: {
    width: "100%",
    height: 260,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f0f0f0",
    borderRadius: 4,
    fontSize: 16,
    color: "#666"
  },
  title: {
    fontSize: 18,
    fontWeight: 600
  },
  authors: {
    fontSize: 14,
    color: "#555"
  }
};
