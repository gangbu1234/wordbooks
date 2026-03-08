'use client';

import React, { useState, useEffect } from 'react';
import { motion, useAnimation, PanInfo } from 'framer-motion';
import styles from './Flashcard.module.css';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface CardData {
    word: string;
    meaning: string;
}

interface FlashcardProps {
    data: CardData[];
    currentIndex: number;
    onNext: () => void;
    onPrev: () => void;
}

const Flashcard: React.FC<FlashcardProps> = ({ data, currentIndex, onNext, onPrev }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const controls = useAnimation();
    const currentWord = data[currentIndex] || { word: '', meaning: '' };

    // Reset flip when word changes
    useEffect(() => {
        setIsFlipped(false);
    }, [currentIndex]);

    const handleDragEnd = (_: any, info: PanInfo) => {
        const threshold = 50;
        const { offset, velocity } = info;

        // Detect horizontal swipe (Left/Right)
        if (Math.abs(offset.x) > threshold && Math.abs(offset.x) > Math.abs(offset.y)) {
            setIsFlipped(!isFlipped);
        }
        // Detect vertical swipe (Up/Down)
        else if (Math.abs(offset.y) > threshold && Math.abs(offset.y) > Math.abs(offset.x)) {
            if (offset.y < 0) {
                // Swipe Up -> Next
                onNext();
            } else {
                // Swipe Down -> Prev
                onPrev();
            }
        }
    };

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
                <motion.div
                    className={`${styles.cardInner} ${isFlipped ? styles.cardFlipped : ''}`}
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                >
                    {/* Front Face: Word */}
                    <div className={`${styles.cardFace} ${styles.cardFront}`}>
                        <span className={styles.hint}>Word</span>
                        <div className={styles.word}>{currentWord.word}</div>
                        <div className={styles.hint}>Swipe L/R to Flip</div>
                        <div className={styles.hint} style={{ opacity: 0.5, bottom: '8px' }}>
                            {currentIndex + 1} / {data.length}
                        </div>
                    </div>

                    {/* Back Face: Meaning */}
                    <div className={`${styles.cardFace} ${styles.cardBack}`}>
                        <span className={styles.hint}>Meaning</span>
                        <div className={styles.meaning}>{currentWord.meaning}</div>
                        <div className={styles.hint}>Swipe Up/Down for Next/Prev</div>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default Flashcard;
