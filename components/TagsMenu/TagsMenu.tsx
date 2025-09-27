'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NOTE_TAGS, type NoteTag } from '@/types/note';
import css from './TagsMenu.module.css';

type TagOption = NoteTag | 'All';

type TagsMenuProps = {
  onNavigate?: () => void;
};

const TAG_OPTIONS: Array<{ label: string; value: TagOption }> = [
  { label: 'All notes', value: 'All' },
  ...NOTE_TAGS.map((tag) => ({ label: tag, value: tag })),
];

const getHrefForTag = (tag: TagOption) =>
  tag === 'All' ? '/notes/filter/All' : `/notes/filter/${tag}`;

const TagsMenu = ({ onNavigate }: TagsMenuProps) => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleOutsideClick);

    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [isOpen]);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const activeTag = useMemo<TagOption>(() => {
    const segments = pathname.split('/').filter(Boolean);
    const tagCandidate = segments.length >= 3 && segments[0] === 'notes' && segments[1] === 'filter'
      ? segments[2]
      : undefined;

    if (!tagCandidate || tagCandidate === 'All') {
      return 'All';
    }

    return NOTE_TAGS.includes(tagCandidate as NoteTag)
      ? (tagCandidate as NoteTag)
      : 'All';
  }, [pathname]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const handleNavigate = () => {
    if (onNavigate) {
      onNavigate();
    }
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={css.menuContainer}>
      <button
        type="button"
        className={css.menuButton}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={handleToggle}
      >
        Notes ▾
      </button>
      <ul className={css.menuList} role="menu" hidden={!isOpen}>
        {TAG_OPTIONS.map(({ label, value }) => {
          const href = getHrefForTag(value);
          const isActive = value === activeTag;

          return (
            <li key={value} className={css.menuItem} role="none">
              <Link
                href={href}
                role="menuitem"
                className={`${css.menuLink}${isActive ? ` ${css.activeLink}` : ''}`}
                onClick={handleNavigate}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default TagsMenu;
