'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Papa from 'papaparse';
import Flashcard from '@/components/Flashcard';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import styles from './Learn.module.css';

interface WordData {
    word: string;
    meaning: string;
}

export default function LearnPage() {
    const params = useParams();
    const router = useRouter();
    const bookId = params.book as string;

    const [words, setWords] = useState<WordData[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCSV = async () => {
            try {
                const response = await fetch(`/data/${bookId}.csv`);
                if (!response.ok) throw new Error('単語帳の読み込みに失敗しました');

                const csvText = await response.text();
                Papa.parse(csvText, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        const parsedData = results.data as WordData[];
                        if (parsedData.length === 0) {
                            setError('単語リストが空です');
                        } else {
                            setWords(parsedData);
                        }
                        setLoading(false);
                    },
                    error: (err: any) => {
                        setError(err.message);
                        setLoading(false);
                    }
                });
            } catch (err: any) {
                setError(err.message);
                setLoading(false);
            }
        };

        fetchCSV();
    }, [bookId]);

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % words.length);
    };

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev - 1 + words.length) % words.length);
    };

    const handleReset = () => {
        setCurrentIndex(0);
    };

    if (loading) {
        return (
            <div className={styles.center}>
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                >
                    <RotateCcw size={40} className={styles.loadingIcon} />
                </motion.div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.center}>
                <p className={styles.error}>{error}</p>
                <button onClick={() => router.push('/')} className={styles.backButton}>戻る</button>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <nav className={styles.nav}>
                <button onClick={() => router.push('/')} className={styles.navButton}>
                    <ArrowLeft size={24} />
                    <span>一覧</span>
                </button>
                <div className={styles.progress}>
                    {currentIndex + 1} / {words.length}
                </div>
                <button onClick={handleReset} className={styles.navButton}>
                    <RotateCcw size={24} />
                    <span>リセット</span>
                </button>
            </nav>

            <AnimatePresence mode="wait">
                <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                    transition={{ duration: 0.2 }}
                    style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                >
                    <Flashcard
                        data={words}
                        currentIndex={currentIndex}
                        onNext={handleNext}
                        onPrev={handlePrev}
                    />
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
