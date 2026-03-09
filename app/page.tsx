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
      const result = event.target?.result;
      if (!result) return;

      // Simple encoding detection/fix for Japanese characters (Shift-JIS vs UTF-8)
      // If the file is from Excel (Japanese environment), it's likely Shift-JIS.
      let csvText = '';
      const decoder = new TextDecoder('utf-8');
      const dataView = new Uint8Array(result as ArrayBuffer);

      try {
        // Try UTF-8 first
        csvText = decoder.decode(dataView);
        if (csvText.includes('')) { // Replacement character found, probably not UTF-8
          throw new Error('Not UTF-8');
        }
      } catch (e) {
        // Fallback to Shift-JIS (CP932)
        const sjisDecoder = new TextDecoder('shift-jis');
        csvText = sjisDecoder.decode(dataView);
      }

      Papa.parse(csvText, {
        header: false, // Parse as arrays first to find the header row
        skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as string[][];
          if (rows.length === 0) return;

          // Find the header row (the one containing '語彙', '語釈', 'word', 'meaning' etc.)
          let headerIndex = -1;
          for (let i = 0; i < Math.min(rows.length, 5); i++) {
            const rowStr = rows[i].join(',');
            if (rowStr.includes('語彙') || rowStr.includes('語釈') || rowStr.includes('単語') || rowStr.includes('意味') || rowStr.includes('word') || rowStr.includes('meaning')) {
              headerIndex = i;
              break;
            }
          }

          let finalData: any[] = [];
          if (headerIndex !== -1) {
            // Use identified header row
            const headers = rows[headerIndex];
            const wordIdx = headers.findIndex(h => h.includes('語彙') || h.includes('単語') || h.includes('word')) !== -1
              ? headers.findIndex(h => h.includes('語彙') || h.includes('単語') || h.includes('word'))
              : (headers.length > 1 ? 1 : 0);
            const meaningIdx = headers.findIndex(h => h.includes('語釈') || h.includes('意味') || h.includes('meaning') || h.includes('訳')) !== -1
              ? headers.findIndex(h => h.includes('語釈') || h.includes('意味') || h.includes('meaning') || h.includes('訳'))
              : (headers.length > 2 ? 2 : 1);

            finalData = rows.slice(headerIndex + 1).map(row => ({
              word: row[wordIdx]?.trim() || '',
              meaning: row[meaningIdx]?.trim() || ''
            })).filter(item => item.word !== '');
          } else {
            // Fallback: No header found, assume col 0 is word, col 1 is meaning
            finalData = rows.map(row => ({
              word: row[0]?.trim() || '',
              meaning: row[1]?.trim() || ''
            })).filter(item => item.word !== '');
          }

          if (finalData.length === 0) {
            alert('有効なデータが見つかりませんでした。CSVの内容を確認してください。');
            return;
          }

          const newBook: BookItem = {
            id: `custom-${Date.now()}`,
            name: file.name.replace('.csv', ''),
            data: finalData,
            isCustom: true
          };
          const updatedCustom = [newBook, ...customBooks];
          setCustomBooks(updatedCustom);
          localStorage.setItem('custom_wordbooks', JSON.stringify(updatedCustom));
        }
      });
    };
    // Read as ArrayBuffer to handle encoding detection
    reader.readAsArrayBuffer(file);
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
