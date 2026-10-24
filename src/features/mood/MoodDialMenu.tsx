import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react';
import { useAudio } from '../../lib/AudioProvider';
import { getDialPosition } from './dialGeometry';
import { MOODS, type MoodId } from './mood';
import styles from './MoodDial.module.css';

interface MoodDialMenuProps {
  current: MoodId;
  itemRefs: RefObject<Array<HTMLButtonElement | null>>;
  onSelect: (mood: MoodId) => void;
}

export default function MoodDialMenu({ current, itemRefs, onSelect }: MoodDialMenuProps) {
  const { playHover, playClick } = useAudio();
  const moveFocus = (step: number) => {
    const items = itemRefs.current.filter((item): item is HTMLButtonElement => item !== null);
    if (items.length === 0) {
      return;
    }
    const activeIndex = items.findIndex((item) => item === document.activeElement);
    const nextIndex = (activeIndex + step + items.length) % items.length;
    items[nextIndex].focus();
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        moveFocus(1);
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        moveFocus(-1);
        break;
      case 'Home':
        event.preventDefault();
        itemRefs.current[0]?.focus();
        break;
      case 'End':
        event.preventDefault();
        itemRefs.current[MOODS.length - 1]?.focus();
        break;
      default:
        break;
    }
  };

  return (
    <div
      id="mood-dial-menu"
      role="menu"
      aria-label="选择当前情绪"
      className={styles.menu}
      onKeyDown={handleKeyDown}
    >
      {MOODS.map((mood, index) => {
        const position = getDialPosition(index);
        return (
          <button
            key={mood.id}
            ref={(element) => {
              itemRefs.current[index] = element;
            }}
            type="button"
            role="menuitemradio"
            aria-checked={mood.id === current}
            className={styles.item}
            style={{ left: `${position.left}px`, top: `${position.top}px` }}
            onPointerEnter={playHover}
            onClick={() => {
              playClick();
              onSelect(mood.id);
            }}
          >
            <span className={styles.itemEmoji} aria-hidden="true">
              {mood.emoji}
            </span>
            <span className={styles.itemLabel}>{mood.label}</span>
          </button>
        );
      })}
    </div>
  );
}
