import journeyBackgroundImg from '../../assets/path/journey-zigzag-path1.png';
import journeyPathImg from '../../assets/path/journey-zigzag-path.png';

import achievementRingImg from '../../assets/achievements/achievement-ring.png';
import achievementLockedImg from '../../assets/achievements/achievement-locked.png';
import achievementCompleteImg from '../../assets/achievements/achievement-complete.png';

import medalGamesImg from '../../assets/medals/medal-games.png';
import medalMathsImg from '../../assets/medals/medal-maths.png';
import medalEnglishImg from '../../assets/medals/medal-english.png';
import medalBrainImg from '../../assets/medals/medal-brain.png';
import medalPuzzleImg from '../../assets/medals/medal-puzzle.png';
import medalArenaImg from '../../assets/medals/medal-arena.png';

import iconControllerImg from '../../assets/icons/icon-controller.png';
import iconMathImg from '../../assets/icons/icon-math.png';
import iconBookImg from '../../assets/icons/icon-book.png';
import iconBrainImg from '../../assets/icons/icon-brain.png';
import iconPuzzleImg from '../../assets/icons/icon-puzzle.png';

import sparkleImg from '../../assets/effects/sparkle.png';
import confettiImg from '../../assets/effects/confetti.png';

export const journeyAssets = {
  background: journeyBackgroundImg,
  path: journeyPathImg,
  achievements: {
    available: achievementRingImg,
    locked: achievementLockedImg,
    completed: achievementCompleteImg,
  },
  effects: {
    sparkle: sparkleImg,
    confetti: confettiImg,
  },
} as const;

export const journeySectionVisuals = {
  gamesArena: {
    icon: iconControllerImg,
    medal: medalGamesImg,
  },
  maths: {
    icon: iconMathImg,
    medal: medalMathsImg,
  },
  english: {
    icon: iconBookImg,
    medal: medalEnglishImg,
  },
  ncertLearning: {
    icon: iconBookImg,
    medal: medalArenaImg,
  },
  brainBooster: {
    icon: iconBrainImg,
    medal: medalBrainImg,
  },
  puzzleSolver: {
    icon: iconPuzzleImg,
    medal: medalPuzzleImg,
  },
} as const;

export type JourneySectionVisualKey = keyof typeof journeySectionVisuals;

export function getJourneyIcon(key: JourneySectionVisualKey): string {
  return journeySectionVisuals[key].icon;
}

export function getJourneyMedal(key: JourneySectionVisualKey): string {
  return journeySectionVisuals[key].medal;
}

