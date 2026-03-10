'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Papa from 'papaparse';
import Flashcard from '@/components/Flashcard';
import { Loader2, ChevronLeft } from 'lucide-react';
import styles from './Learn.module.css';

interface CardData {
    word: string;
    meaning: string;
    checks: boolean[];
    rawRow?: string[];
}

const LearnPage = () => {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const bookId = params.book as string;
    const isCustom = searchParams.get('custom') === 'true';

    const [data, setData] = useState<CardData[]>([]);
    const [filteredData, setFilteredData] = useState<CardData[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<number>(0);

    useEffect(() => {
        const fetchCSV = async () => {
            if (isCustom) {
                const saved = localStorage.getItem('custom_wordbooks');
                if (saved) {
                    const customBooks = JSON.parse(saved);
                    const currentBook = customBooks.find((b: any) => b.id === bookId);
                    if (currentBook && currentBook.data) {
                        // Initialize checks from existing data if found, otherwise map from rawRow
                        const initialized = currentBook.data.map((item: any) => ({
                            ...item,
                            checks: item.checks || (item.rawRow ? [2, 3, 4, 5, 6, 7].map(idx => {
                                const v = String(item.rawRow[idx] || '').toLowerCase().trim();
                                return v === '1' || v === 'o' || v === 'v' || v === 'checked';
                            }) : [false, false, false, false, false, false])
                        }));
                        setData(initialized);
                        setLoading(false);
                        return;
                    }
                }
                setError('カスタム単語帳が見つかりませんでした');
                setLoading(false);
                return;
            }

            try {
                const response = await fetch(`/data/${bookId}.csv`);
                if (!response.ok) throw new Error('単語帳の読み込みに失敗しました');
                const csvText = await response.text();

                Papa.parse(csvText, {
                    header: false,
                    skipEmptyLines: 'greedy',
                    complete: (results) => {
                        const rows = results.data as string[][];

                        // Load persistent checks from localStorage for this specific book
                        const savedChecks = localStorage.getItem(`checks_${bookId}`);
                        const checkMap = savedChecks ? JSON.parse(savedChecks) : {};

                        const parsed = rows.map((row, rIdx) => {
                            // Priority 1: Use checkMap (local storage)
                            // Priority 2: Use CSV columns (imported data)
                            const csvChecks = [2, 3, 4, 5, 6, 7].map(idx => {
                                const v = String(row[idx] || '').toLowerCase().trim();
                                return v === '1' || v === 'o' || v === 'v' || v === 'checked';
                            });

                            // Composite key for robustness: index + word
                            const key = `${rIdx}_${row[0]}`;
                            const finalChecks = checkMap[key] || csvChecks;

                            return {
                                word: row[0] || '',
                                meaning: row[1] || '',
                                checks: finalChecks,
                                rawRow: row
                            };
                        }).filter(item => item.word !== '');

                        setData(parsed);
                        setLoading(false);
                    }
                });
            } catch (err: any) {
                setError(err.message);
                setLoading(false);
            }
        };

        fetchCSV();
    }, [bookId, isCustom]);

    // Filtering Logic: Uses 'checks' array for real-time reactivity
    useEffect(() => {
        if (!data || data.length === 0) {
            setFilteredData([]);
            return;
        }

        let result = [...data];
        switch (activeFilter) {
            case 1:
                result = data.filter(item => item.checks[0]);
                break;
            case 2:
                result = data.filter(item => item.checks[0] && item.checks[1]);
                break;
            case 3:
                result = [...data];
                break;
            case 4:
                result = data.filter(item => item.checks[3]);
                break;
            case 5:
                result = data.filter(item => item.checks[3] && item.checks[4]);
                break;
            case 6:
                result = [...data];
                break;
            default:
                result = [...data];
        }

        setFilteredData(result);
        setCurrentIndex(0);
    }, [data, activeFilter]);

    const handleCheckToggle = (filteredIdx: number, checkIdx: number) => {
        // We need to find the original index in the main 'data' array
        const targetWord = filteredData[filteredIdx];
        if (!targetWord) return;

        const newData = data.map(item => {
            if (item.word === targetWord.word && item.meaning === targetWord.meaning) {
                const newChecks = [...item.checks];
                newChecks[checkIdx] = !newChecks[checkIdx];
                return { ...item, checks: newChecks };
            }
            return item;
        });

        setData(newData);

        // PERSIST CHECK DATA
        // Map current state to a simple object for storage
        const checkMap: Record<string, boolean[]> = {};
        newData.forEach((item, idx) => {
            const key = `${idx}_${item.word}`;
            checkMap[key] = item.checks;
        });
        localStorage.setItem(`checks_${bookId}`, JSON.stringify(checkMap));

        // Also persist if it's a custom book (the whole book data)
        if (isCustom) {
            const saved = localStorage.getItem('custom_wordbooks');
            if (saved) {
                const customBooks = JSON.parse(saved);
                const updatedBooks = customBooks.map((b: any) =>
                    b.id === bookId ? { ...b, data: newData } : b
                );
                localStorage.setItem('custom_wordbooks', JSON.stringify(updatedBooks));
            }
        }
    };

    const handleNext = () => {
        if (filteredData.length === 0) return;
        setCurrentIndex((prev) => (prev + 1) % filteredData.length);
    };

    const handlePrev = () => {
        if (filteredData.length === 0) return;
        setCurrentIndex((prev) => (prev - 1 + filteredData.length) % filteredData.length);
    };

    if (loading) {
        return (
            <div className={styles.center}>
                <Loader2 className={`${styles.loadingIcon} animate-spin`} size={48} />
                <p>学習の準備中...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.center}>
                <div className={styles.error}>{error}</div>
                <button className={styles.backButton} onClick={() => router.push('/')}>
                    ホームに戻る
                </button>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <nav className={styles.nav}>
                <button className={styles.navButton} onClick={() => router.push('/')}>
                    <ChevronLeft size={20} />
                    <span>Back</span>
                </button>
                <div className={styles.progress}>
                    {filteredData.length > 0 ? `${currentIndex + 1} / ${filteredData.length}` : '0 / 0'}
                </div>
                <div style={{ width: '40px' }}></div>
            </nav>

            <div className={styles.filterArea}>
                <div className={styles.filterScroll}>
                    {[0, 1, 2, 3, 4, 5, 6].map((num) => (
                        <button
                            key={num}
                            className={`${styles.filterChip} ${activeFilter === num ? styles.activeChip : ''}`}
                            onClick={() => setActiveFilter(num)}
                        >
                            {num === 0 ? '全表示' : `STEP ${num}`}
                        </button>
                    ))}
                </div>
                <div className={styles.filterInfo}>
                    {activeFilter === 0 && "全表示中"}
                    {activeFilter === 1 && "1個目のチェック済みのみ抽出"}
                    {activeFilter === 2 && "1個目と2回目の両方にチェックがある語を抽出"}
                    {activeFilter === 3 && "全表示（リセット）"}
                    {activeFilter === 4 && "4個目のチェック済みのみ抽出"}
                    {activeFilter === 5 && "4回目と5回目の両方にチェックがある語を抽出"}
                    {activeFilter === 6 && "全表示（リセット）"}
                </div>
            </div>

            <main className={styles.main}>
                {filteredData.length > 0 ? (
                    <Flashcard
                        data={filteredData}
                        currentIndex={currentIndex}
                        onNext={handleNext}
                        onPrev={handlePrev}
                        onCheckToggle={handleCheckToggle}
                    />
                ) : (
                    <div className={styles.center}>
                        <p>該当する単語はありません</p>
                        <button className={styles.backButton} onClick={() => setActiveFilter(0)} style={{ marginTop: '20px' }}>
                            フィルターを解除
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};

export default LearnPage;
