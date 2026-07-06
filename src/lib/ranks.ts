// @ts-ignore
import grandmasterImg from '../assets/freefire_grandmaster.jpg';
// @ts-ignore
import heroicImg from '../assets/freefire_heroic.jpg';
// @ts-ignore
import diamondImg from '../assets/freefire_diamond.jpg';
// @ts-ignore
import platinumImg from '../assets/freefire_platinum.jpg';
// @ts-ignore
import goldImg from '../assets/freefire_gold.jpg';
// @ts-ignore
import silverImg from '../assets/freefire_silver.jpg';
// @ts-ignore
import bronzeImg from '../assets/freefire_bronze.jpg';

export interface RankInfo {
  title: string;
  division: string;
  icon: string;
  img?: string;
  stars: number;
  maxStars: number;
  pointsToNext: number;
  progressPct: number;
  gradient: string;
  text: string;
  badgeStyle: string;
}

export const getRankInfo = (pts: number): RankInfo => {
  if (pts >= 12000) {
    const starVal = Math.min(5, Math.floor((pts - 12000) / 1000) + 1);
    return {
      title: 'Grandmaster', division: '', icon: '🏆', img: grandmasterImg,
      stars: starVal, maxStars: 5,
      pointsToNext: 0, progressPct: 100,
      gradient: 'from-amber-400 via-yellow-500 to-amber-600',
      text: 'text-amber-900 bg-amber-100/90 border-amber-300',
      badgeStyle: 'border-amber-400 shadow-amber-200/50'
    };
  }
  if (pts >= 8000) {
    const starVal = Math.min(5, Math.floor((pts - 8000) / 800) + 1);
    const nextThreshold = 8000 + starVal * 800;
    const prevThreshold = nextThreshold - 800;
    return {
      title: 'Heroic', division: '', icon: '🔥', img: heroicImg,
      stars: starVal, maxStars: 5,
      pointsToNext: nextThreshold - pts, progressPct: Math.round(((pts - prevThreshold) / 800) * 100) || 0,
      gradient: 'from-red-500 via-rose-600 to-orange-500',
      text: 'text-rose-900 bg-rose-100/90 border-rose-300',
      badgeStyle: 'border-red-500 shadow-red-200/50'
    };
  }
  if (pts >= 5000) {
    const divIndex = Math.min(4, Math.floor((pts - 5000) / 750) + 1);
    const rangeStart = 5000 + (divIndex - 1) * 750;
    const rangeEnd = rangeStart + 750;
    const stars = Math.min(4, Math.floor(((pts - rangeStart) / 750) * 4) + 1);
    return {
      title: 'Diamond', division: ['I', 'II', 'III', 'IV'][divIndex - 1], icon: '💎', img: diamondImg,
      stars, maxStars: 4,
      pointsToNext: rangeEnd - pts, progressPct: Math.round(((pts - rangeStart) / 750) * 100) || 0,
      gradient: 'from-cyan-400 via-blue-500 to-indigo-600',
      text: 'text-indigo-800 bg-indigo-100/90 border-indigo-300',
      badgeStyle: 'border-indigo-400 shadow-indigo-200/50'
    };
  }
  if (pts >= 3000) {
    const divIndex = Math.min(4, Math.floor((pts - 3000) / 500) + 1);
    const rangeStart = 3000 + (divIndex - 1) * 500;
    const rangeEnd = rangeStart + 500;
    const stars = Math.min(4, Math.floor(((pts - rangeStart) / 500) * 4) + 1);
    return {
      title: 'Platinum', division: ['I', 'II', 'III', 'IV'][divIndex - 1], icon: '⚜️', img: platinumImg,
      stars, maxStars: 4,
      pointsToNext: rangeEnd - pts, progressPct: Math.round(((pts - rangeStart) / 500) * 100) || 0,
      gradient: 'from-teal-400 via-emerald-500 to-cyan-600',
      text: 'text-emerald-900 bg-emerald-100/90 border-emerald-300',
      badgeStyle: 'border-emerald-400 shadow-emerald-200/50'
    };
  }
  if (pts >= 1800) {
    const divIndex = Math.min(4, Math.floor((pts - 1800) / 300) + 1);
    const rangeStart = 1800 + (divIndex - 1) * 300;
    const rangeEnd = rangeStart + 300;
    const stars = Math.min(3, Math.floor(((pts - rangeStart) / 300) * 3) + 1);
    return {
      title: 'Gold', division: ['I', 'II', 'III', 'IV'][divIndex - 1], icon: '🥇', img: goldImg,
      stars, maxStars: 3,
      pointsToNext: rangeEnd - pts, progressPct: Math.round(((pts - rangeStart) / 300) * 100) || 0,
      gradient: 'from-yellow-400 via-orange-400 to-yellow-600',
      text: 'text-amber-950 bg-amber-100/90 border-amber-300',
      badgeStyle: 'border-amber-400 shadow-amber-200/50'
    };
  }
  if (pts >= 800) {
    const divIndex = Math.min(3, Math.floor((pts - 800) / 333) + 1);
    const rangeStart = 800 + (divIndex - 1) * 333;
    const rangeEnd = rangeStart + 333;
    const stars = Math.min(3, Math.floor(((pts - rangeStart) / 333) * 3) + 1);
    return {
      title: 'Silver', division: ['I', 'II', 'III'][divIndex - 1], icon: '🥈', img: silverImg,
      stars, maxStars: 3,
      pointsToNext: rangeEnd - pts, progressPct: Math.round(((pts - rangeStart) / 333) * 100) || 0,
      gradient: 'from-slate-300 via-slate-400 to-slate-500',
      text: 'text-slate-900 bg-slate-100/90 border-slate-300',
      badgeStyle: 'border-slate-400 shadow-slate-200/50'
    };
  }
  const divIndex = Math.min(3, Math.floor(pts / 266) + 1);
  const rangeStart = (divIndex - 1) * 266;
  const rangeEnd = rangeStart + 266;
  const stars = Math.min(3, Math.floor(((pts - rangeStart) / 266) * 3) + 1);
  return {
    title: 'Bronze', division: ['I', 'II', 'III'][divIndex - 1], icon: '🟫', img: bronzeImg,
    stars, maxStars: 3,
    pointsToNext: rangeEnd - pts, progressPct: Math.round(((pts - rangeStart) / 266) * 100) || 0,
    gradient: 'from-amber-700 via-orange-800 to-amber-900',
    text: 'text-amber-950 bg-amber-100/90 border-amber-300',
    badgeStyle: 'border-amber-600 shadow-amber-200/50'
  };
};
