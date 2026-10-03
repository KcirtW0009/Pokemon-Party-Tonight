'use client';
import { useId, useMemo, useState } from 'react';
import type { Pokemon } from '@/lib/types';
import { searchPokemon } from '@/lib/pokemon';

interface Props {
  onSelect: (p: Pokemon) => void;
  showImage?: boolean;
  showDexNumber?: boolean;
  disabledPokemon?: number[];
  allowedPokemon?: number[];
  disabledIds?: Set<number> | number[];
  disabled?: boolean;
  placeholder?: string;
  confirmLabel?: string;
}

/** 共享宝可梦搜索/选择器：中文 / 英文 / 拼音 / 图鉴号，最多 5 个候选。 */
export function PokemonSelector({
  onSelect,
  showImage = true,
  showDexNumber = true,
  disabledPokemon,
  allowedPokemon,
  disabledIds,
  disabled = false,
  placeholder = '输入中文 / 英文 / 拼音搜索宝可梦',
  confirmLabel,
}: Props) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const listId = useId();
  const excluded = useMemo(
    () => (disabledIds ? new Set(Array.isArray(disabledIds) ? disabledIds : [...disabledIds]) : undefined),
    [disabledIds],
  );
  const results = useMemo(() => searchPokemon(query, 5, new Set([...(excluded ?? []), ...(disabledPokemon ?? [])]), allowedPokemon), [query, excluded, disabledPokemon, allowedPokemon]);
  const open = query.trim().length > 0 && !disabled;

  const pick = (p: Pokemon) => {
    setQuery('');
    onSelect(p);
  };

  return (
    <div className="selector">
      <input
        className="input"
        value={query}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={placeholder}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && results[cursor] ? `${listId}-${cursor}` : undefined}
        onChange={(e) => { setQuery(e.target.value); setCursor(0); }}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing) return;
          if (e.key === 'Escape') setQuery('');
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            setCursor(n => Math.max(0, Math.min(results.length - 1, n + (e.key === 'ArrowDown' ? 1 : -1))));
          }
          if (e.key === 'Enter' && open && results[cursor]) { e.preventDefault(); pick(results[cursor]); }
        }}
      />
      {open && results.length > 0 && (
        <div className="suggest" role="listbox" id={listId}>
          {results.map((p, i) => (
            <button key={p.id} id={`${listId}-${i}`} role="option" aria-selected={i === cursor} type="button" onClick={() => pick(p)}>
              {showImage && <img src={p.image} alt="" />}
              <span>
                {p.nameZh}
                <span className="muted"> {showDexNumber && `#${p.id}`} {p.nameEn}</span>
                {confirmLabel && <span className="muted"> · {confirmLabel}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
      {open && results.length === 0 && (
        <div className="suggest">
          <button type="button" disabled>
            <span className="muted">没有找到，换个关键词试试</span>
          </button>
        </div>
      )}
    </div>
  );
}
