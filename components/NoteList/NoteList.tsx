import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import type { Note } from '@/types/note';
import { deleteNote } from '@/lib/api/clientApi';
import css from './NoteList.module.css';

interface NoteListProps {
  notes: Note[];
}

const NoteList = ({ notes }: NoteListProps) => {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: deleteNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  const handleDeleteNote = (id: string) => {
    deleteMutation.mutate(id);
  };

  if (!notes.length) return null;

  const getTagClassName = (tag: string) => {
    const tagClasses = {
      Todo: css.tagTodo,
      Work: css.tagWork,
      Personal: css.tagPersonal,
      Meeting: css.tagMeeting,
      Shopping: css.tagShopping,
    };
    return `${css.tag} ${tagClasses[tag as keyof typeof tagClasses] || css.tag}`;
  };

  return (
    <ul className={css.list}>
      {notes.map((note) => (
        <li key={note.id} className={css.listItem}>
          <h2 className={css.title}>{note.title}</h2>
          <p className={css.content}>{note.content}</p>
          <div className={css.footer}>
            <span className={getTagClassName(note.tag)}>{note.tag}</span>
            <div className={css.actions}>
              <Link href={`/notes/${note.id}`} className={css.button}>
                View details
              </Link>
              <button
                className={css.button}
                onClick={() => handleDeleteNote(note.id)}
                disabled={deleteMutation.isPending}
              >
                Delete
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default NoteList;
