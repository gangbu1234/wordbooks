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
    const [direction, setDirection] = useState(0); // 1 for down (next), -1 for up (prev)
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
        setDirection(1);
        setCurrentIndex((prev) => (prev + 1) % words.length);
    };

    const handlePrev = () => {
        setDirection(-1);
        setCurrentIndex((prev) => (prev - 1 + words.length) % words.length);
    };

    const handleReset = () => {
        setDirection(0);
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

            <AnimatePresence mode="popLayout" custom={direction} initial={false}>
                <motion.div
                    key={currentIndex}
                    custom={direction}
                    variants={{
                        enter: (direction: number) => ({
                            y: direction > 0 ? '100%' : direction < 0 ? '-100%' : 0,
                            opacity: 0,
                        }),
                        center: {
                            y: 0,
                            opacity: 1,
                        },
                        exit: (direction: number) => ({
                            y: direction > 0 ? '-100%' : direction < 0 ? '100%' : 0,
                            opacity: 0,
                        }),
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                        y: { type: 'spring', stiffness: 300, damping: 30 },
                        opacity: { duration: 0.2 },
                    }}
                    style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        position: 'absolute'
                    }}
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
