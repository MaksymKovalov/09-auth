'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NOTE_TAGS, type NoteTag } from '@/types/note';
import css from './SidebarNotes.module.css';

type TagOption = NoteTag | 'All';

const TAG_OPTIONS: Array<{ label: string; value: TagOption }> = [
  { label: 'All notes', value: 'All' },
  ...NOTE_TAGS.map((tag) => ({ label: tag, value: tag })),
];

const getHrefForTag = (tag: TagOption) =>
  tag === 'All' ? '/notes/filter/All' : `/notes/filter/${tag}`;

const SidebarNotes = () => {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  const currentTag =
    segments.length >= 3 && segments[0] === 'notes' && segments[1] === 'filter'
      ? (segments[2] as TagOption)
      : 'All';

  return (
    <ul className={css.menuList}>
      {TAG_OPTIONS.map(({ label, value }) => {
        const href = getHrefForTag(value);
        const isActive =
          currentTag === value ||
          (value === 'All' &&
            currentTag !== value &&
            !NOTE_TAGS.includes(currentTag as NoteTag));

        return (
          <li key={value} className={css.menuItem}>
            <Link
              href={href}
              className={`${css.menuLink}${isActive ? ` ${css.activeLink}` : ''}`}
            >
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
};

export default SidebarNotes;
