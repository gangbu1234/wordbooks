'use client';

import React, { useState, useEffect } from 'react';
import { motion, useAnimation, PanInfo } from 'framer-motion';
import styles from './Flashcard.module.css';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface CardData {
    word: string;
    meaning: string;
    checks: boolean[];
}

interface FlashcardProps {
    data: CardData[];
    currentIndex: number;
    onNext: () => void;
    onPrev: () => void;
    onCheckToggle: (wordIndex: number, checkIndex: number) => void;
}

const Flashcard: React.FC<FlashcardProps> = ({ data, currentIndex, onNext, onPrev, onCheckToggle }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const currentWord = data[currentIndex] || { word: '', meaning: '', checks: [false, false, false, false, false, false] };

    // Reset flip when word changes
    useEffect(() => {
        setIsFlipped(false);
    }, [currentIndex]);

    const handleDragEnd = (_: any, info: PanInfo) => {
        const threshold = 50;
        const { offset } = info;

        // Detect horizontal swipe (Left/Right)
        if (Math.abs(offset.x) > threshold && Math.abs(offset.x) > Math.abs(offset.y)) {
            setIsFlipped(!isFlipped);
        }
        // Detect vertical swipe (Up/Down)
        else if (Math.abs(offset.y) > threshold && Math.abs(offset.y) > Math.abs(offset.x)) {
            if (offset.y < 0) {
                onNext();
            } else {
                onPrev();
            }
        }
    };

    const currentChecks = currentWord.checks || [false, false, false, false, false, false];

    return (
        <div className={styles.container}>
            <div className={styles.swipeInstruction}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', alignItems: 'center' }}>
                    <div></div>
                    <ChevronUp className={styles.instructionIcon} />
                    <div></div>
                    <ChevronLeft className={styles.instructionIcon} />
                    <div style={{ padding: '40px' }}></div>
                    <ChevronRight className={styles.instructionIcon} />
                    <div></div>
                    <ChevronDown className={styles.instructionIcon} />
                    <div></div>
                </div>
            </div>

            <motion.div
                className={styles.cardWrapper}
                drag
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                dragElastic={0.2}
                onDragEnd={handleDragEnd}
                whileTap={{ scale: 0.98 }}
            >
                <div className={styles.cardInner}>
                    <div className={styles.cardFace}>
                        <span className={styles.hintTop}>{isFlipped ? 'MEANING' : 'WORD'}</span>

                        <div className={isFlipped ? styles.meaning : styles.word}>
                            {isFlipped ? currentWord.meaning : currentWord.word}
                        </div>

                        <div className={styles.checkRow}>
                            {currentChecks.map((isChecked, i) => (
                                <button
                                    key={i}
                                    className={`${styles.checkButton} ${isChecked ? styles.checked : ''}`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onCheckToggle(currentIndex, i);
                                    }}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>

                        <span className={styles.hintBottom}>
                            Swipe L/R to Flip • Up/Down for next
                        </span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Flashcard;
