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
    const [activeFilter, setActiveFilter] = useState<number>(0); // 0=ALL, 1-6=Filters

    useEffect(() => {
        const fetchCSV = async () => {
            if (isCustom) {
                const saved = localStorage.getItem('custom_wordbooks');
                if (saved) {
                    const customBooks = JSON.parse(saved);
                    const currentBook = customBooks.find((b: any) => b.id === bookId);
                    if (currentBook && currentBook.data) {
                        setData(currentBook.data);
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
                        // Basic word/meaning mapping for default files
                        const parsed = rows.map(row => ({
                            word: row[0] || '',
                            meaning: row[1] || '',
                            rawRow: row
                        })).filter(item => item.word !== '');

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

    // Filtering Logic based on User Request
    useEffect(() => {
        if (!data || data.length === 0) {
            setFilteredData([]);
            return;
        }

        let result = [...data];
        const isSet = (row: string[] | undefined, idx: number) => {
            if (!row || !row[idx]) return false;
            const v = row[idx].toLowerCase().trim();
            return v === '1' || v === 'o' || v === 'checked' || v === 'v';
        };

        switch (activeFilter) {
            case 1: // 1個目: チェックがある語のみ
                result = data.filter(item => isSet(item.rawRow, 2));
                break;
            case 2: // 2個目: 1回目 ∩ 2回目
                result = data.filter(item => isSet(item.rawRow, 2) && isSet(item.rawRow, 3));
                break;
            case 3: // 3個目: すべて出力
                result = [...data];
                break;
            case 4: // 4個目: 4個目にチェックがある語
                result = data.filter(item => isSet(item.rawRow, 5));
                break;
            case 5: // 5個目: 4回目 ∩ 5回目
                result = data.filter(item => isSet(item.rawRow, 5) && isSet(item.rawRow, 6));
                break;
            case 6: // 6個目: すべて出力
                result = [...data];
                break;
            default:
                result = [...data];
        }

        setFilteredData(result);
        setCurrentIndex(0);
    }, [data, activeFilter]);

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
                    {activeFilter === 0 && "全600語を表示中"}
                    {activeFilter === 1 && "1回目チェック分のみ抽出"}
                    {activeFilter === 2 && "1回目と2回目の重複分を抽出"}
                    {activeFilter === 3 && "全表示モード"}
                    {activeFilter === 4 && "4回目チェック分のみ抽出"}
                    {activeFilter === 5 && "4回目と5回目の重複分を抽出"}
                    {activeFilter === 6 && "全表示モード"}
                </div>
            </div>

            <main className={styles.main}>
                {filteredData.length > 0 ? (
                    <Flashcard
                        data={filteredData}
                        currentIndex={currentIndex}
                        onNext={handleNext}
                        onPrev={handlePrev}
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
