'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Book, ChevronRight, GraduationCap, Upload, Trash2 } from 'lucide-react';
import Papa from 'papaparse';
import styles from './Home.module.css';

interface BookItem {
  id: string;
  name: string;
  file?: string;
  data?: any[]; // For custom imported books
  isCustom?: boolean;
}

export default function Home() {
  const [books, setBooks] = useState<BookItem[]>([]);
  const [customBooks, setCustomBooks] = useState<BookItem[]>([]);

  useEffect(() => {
    // Load default books
    fetch('/data/books.json')
      .then(res => res.json())
      .then(data => setBooks(data))
      .catch(err => console.error('Failed to load books.json:', err));

    // Load custom books from localStorage
    const saved = localStorage.getItem('custom_wordbooks');
    if (saved) {
      setCustomBooks(JSON.parse(saved));
    }
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const csvText = event.target?.result as string;
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const newBook: BookItem = {
            id: `custom-${Date.now()}`,
            name: file.name.replace('.csv', ''),
            data: results.data,
            isCustom: true
          };
          const updatedCustom = [newBook, ...customBooks];
          setCustomBooks(updatedCustom);
          localStorage.setItem('custom_wordbooks', JSON.stringify(updatedCustom));
        }
      });
    };
    reader.readAsText(file);
  };

  const deleteCustomBook = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    const updated = customBooks.filter(b => b.id !== id);
    setCustomBooks(updated);
    localStorage.setItem('custom_wordbooks', JSON.stringify(updated));
  };

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div className={styles.logoAndTitle}>
          <GraduationCap size={40} className={styles.logoIcon} />
          <h1 className={styles.title}>Wordbooks</h1>
        </div>
        <p className={styles.subtitle}>学習する単語帳を選択してください</p>
      </header>

      <section className={styles.bookList}>
        <div className={styles.importSection}>
          <label className={styles.importButton}>
            <Upload size={20} />
            <span>CSVファイルを読み込む</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        {/* Custom Books */}
        {customBooks.map((book, index) => (
          <motion.div
            key={book.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <div className={styles.bookCardWrapper}>
              <Link
                href={{
                  pathname: `/learn/${book.id}`,
                  query: { custom: 'true' }
                }}
                className={`${styles.bookCard} ${styles.customCard}`}
              >
                <div className={styles.cardContent}>
                  <div className={`${styles.iconWrapper} ${styles.customIcon}`}>
                    <Book className={styles.bookIcon} />
                  </div>
                  <div className={styles.bookInfo}>
                    <span className={styles.bookName}>{book.name}</span>
                    <span className={styles.bookMeta}>カスタム単語帳</span>
                  </div>
                </div>
                <div className={styles.cardActions}>
                  <button
                    onClick={(e) => deleteCustomBook(book.id, e)}
                    className={styles.deleteButton}
                    title="削除"
                  >
                    <Trash2 size={18} />
                  </button>
                  <ChevronRight className={styles.chevron} />
                </div>
              </Link>
            </div>
          </motion.div>
        ))}

        {/* Default Books */}
        {books.map((book, index) => (
          <motion.div
            key={book.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (customBooks.length + index) * 0.1 }}
          >
            <Link href={`/learn/${book.id}`} className={styles.bookCard}>
              <div className={styles.cardContent}>
                <div className={styles.iconWrapper}>
                  <Book className={styles.bookIcon} />
                </div>
                <div className={styles.bookInfo}>
                  <span className={styles.bookName}>{book.name}</span>
                  <span className={styles.bookMeta}>{book.id}.csv</span>
                </div>
              </div>
              <ChevronRight className={styles.chevron} />
            </Link>
          </motion.div>
        ))}
      </section>

      <footer className={styles.footer}>
        <p>&copy; 2024 Wordbooks For Students</p>
      </footer>
    </main>
  );
}
