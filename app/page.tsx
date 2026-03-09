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

      let csvText = '';
      const dataView = new Uint8Array(result as ArrayBuffer);

      // Detect ZIP/Excel binary (Starts with PK)
      if (dataView[0] === 0x50 && dataView[1] === 0x4B) {
        alert('Excelファイル(.xlsx)をそのまま読み込むことはできません。「名前をつけて保存」から「CSV(コンマ区切り)」を選んで保存し直したファイルを選択してください。');
        return;
      }

      try {
        csvText = new TextDecoder('utf-8', { fatal: true }).decode(dataView);
      } catch (e) {
        csvText = new TextDecoder('shift-jis').decode(dataView);
      }

      Papa.parse(csvText, {
        header: false,
        skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = (results.data as any[][]).map(row =>
            row.map(cell => String(cell || '').trim().replace(/[\u0000-\u001F\u007F-\u009F\uFEFF\u200B-\u200D]/g, ""))
          ).filter(row => row.some(cell => cell !== ''));

          if (rows.length === 0) return;

          // 1. Identify header row (priority: includes keywords)
          let headerIndex = rows.findIndex(row =>
            row.some(cell => /語彙|語釈|単語|意味|word|meaning/i.test(cell))
          );
          const dataRows = rows.slice(headerIndex === -1 ? 0 : headerIndex + 1);

          const finalData = dataRows.map(row => {
            // find all cells that are not just numbers and not empty
            const textCells = row.map((cell, idx) => ({ cell: cell.trim(), idx }))
              .filter(obj => obj.cell.length > 0 && isNaN(Number(obj.cell.replace(/[,.-]/g, ''))));

            // If we didn't find clear text cells, just take the first two non-empty ones
            let word = '';
            let meaning = '';

            if (textCells.length >= 2) {
              word = textCells[0].cell;
              meaning = textCells[1].cell;
            } else {
              const nonEmpties = row.map(c => c.trim()).filter(c => c.length > 0);
              word = nonEmpties[0] || '';
              meaning = nonEmpties[1] || '';
            }

            return { word, meaning };
          }).filter(item => item.word.length > 0);

          if (finalData.length === 0) {
            alert('有効なデータを見つかりませんでした。別のCSVを試してください。');
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
          alert(`${finalData.length} 件の単語を読み込みました！`);
        }
      });
    };
    reader.readAsArrayBuffer(file);
  };

  const clearAllCustom = () => {
    if (confirm('すべてのカスタム単語帳を削除しますか？')) {
      setCustomBooks([]);
      localStorage.removeItem('custom_wordbooks');
    }
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
            <span>CSVを追加</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>
          <button onClick={clearAllCustom} className={styles.clearButton} title="初期化">
            <Trash2 size={20} />
          </button>
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
        <p style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: '4px' }}>Build: 2024.03.10.05 (Excel Detection & Scroll Fix)</p>
      </footer>
    </main>
  );
}
