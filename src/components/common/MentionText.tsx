import React, { useState, useRef } from 'react';
import { useCampaignStore } from '../../store/useCampaignStore';
import { AtSign, Hash } from 'lucide-react';

interface MentionTextProps {
  text: string;
  className?: string;
}

const MENTION_REGEX = /([@#][a-zA-ZÀ-ÿ0-9_-]+)/g;

export const MentionText: React.FC<MentionTextProps> = ({ text, className = '' }) => {
  const entities = useCampaignStore((s) => s.entities);
  const navigateToHandle = useCampaignStore((s) => s.navigateToHandle);

  if (!text) return null;

  const paragraphs = text.split('\n');

  return (
    <div className={`space-y-2 leading-relaxed ${className}`}>
      {paragraphs.map((para, pIdx) => {
        if (!para.trim()) return <div key={pIdx} className="h-1" />;
        const parts = para.split(MENTION_REGEX);

        return (
          <p key={pIdx} className="leading-relaxed">
            {parts.map((part, idx) => {
              if (part.startsWith('@') || part.startsWith('#')) {
                const isAt = part.startsWith('@');
                const clean = part.slice(1).toLowerCase();
                const matchedEntity = entities.find(
                  (e) => e.handle.toLowerCase() === clean
                );

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateToHandle(part);
                    }}
                    title={
                      matchedEntity
                        ? `${matchedEntity.name} — ${matchedEntity.subtitle}`
                        : `Inspecionar ${part}`
                    }
                    className={`inline px-1 -mx-0.5 rounded font-medium transition-colors hover:bg-surface-2 underline underline-offset-2 ${
                      isAt
                        ? 'text-accent decoration-accent/40'
                        : 'text-fg decoration-line-strong'
                    }`}
                  >
                    {part}
                  </button>
                );
              }
              return <React.Fragment key={idx}>{part}</React.Fragment>;
            })}
          </p>
        );
      })}
    </div>
  );
};

interface MentionTextareaProps {
  value: string;
  onChange: (newVal: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

export const MentionTextarea: React.FC<MentionTextareaProps> = ({
  value,
  onChange,
  placeholder,
  rows = 5,
  className = '',
}) => {
  const entities = useCampaignStore((s) => s.entities);
  const [queryInfo, setQueryInfo] = useState<{
    prefix: '@' | '#';
    query: string;
    startIndex: number;
  } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const caret = e.target.selectionStart || 0;
    onChange(val);

    const textBeforeCaret = val.slice(0, caret);
    const match = textBeforeCaret.match(/(?:^|\s)([@#])([a-zA-ZÀ-ÿ0-9_-]*)$/);
    if (match) {
      const prefix = match[1] as '@' | '#';
      const query = match[2];
      const startIndex = caret - query.length - 1;
      setQueryInfo({ prefix, query, startIndex });
    } else {
      setQueryInfo(null);
    }
  };

  const suggestions = queryInfo
    ? entities
        .filter((e) => {
          return (
            e.handle.toLowerCase().includes(queryInfo.query.toLowerCase()) ||
            e.name.toLowerCase().includes(queryInfo.query.toLowerCase())
          );
        })
        .slice(0, 6)
    : [];

  const insertSuggestion = (handle: string, prefix: '@' | '#') => {
    if (!queryInfo) return;
    const before = value.slice(0, queryInfo.startIndex);
    const after = value.slice(
      queryInfo.startIndex + 1 + queryInfo.query.length
    );
    const inserted = `${before}${prefix}${handle} ${after}`;
    onChange(inserted);
    setQueryInfo(null);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 10);
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        rows={rows}
        value={value}
        onChange={handleTextChange}
        placeholder={
          placeholder ||
          'Escreva aqui... Use @ para personagens/facções ou # para locais/itens.'
        }
        className={`input ${className}`}
      />

      <p className="hint flex flex-wrap items-center gap-1">
        <span>Use</span>
        <kbd className="kbd">@</kbd>
        <span>ou</span>
        <kbd className="kbd">#</kbd>
        <span>para mencionar entradas do códice.</span>
      </p>

      {queryInfo && suggestions.length > 0 && (
        <div className="absolute left-2 bottom-9 z-50 w-72 max-w-[calc(100%-1rem)] rounded-lg bg-surface border border-line shadow-elevated overflow-hidden">
          <div className="px-3 py-2 border-b border-line text-xs text-fg-subtle">
            Mencionar entrada
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {suggestions.map((ent) => (
              <button
                key={ent.id}
                type="button"
                onClick={() => insertSuggestion(ent.handle, ent.mentionPrefix)}
                className="w-full px-2 py-1.5 rounded-md text-left hover:bg-surface-2 transition-colors flex items-center gap-2"
              >
                {ent.mentionPrefix === '@' ? (
                  <AtSign className="w-4 h-4 text-fg-subtle shrink-0" />
                ) : (
                  <Hash className="w-4 h-4 text-fg-subtle shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-fg truncate">{ent.name}</div>
                  <div className="text-xs font-mono text-fg-subtle truncate">
                    {ent.mentionPrefix}
                    {ent.handle}
                  </div>
                </div>
                <span className="text-xs text-fg-subtle shrink-0">{ent.category}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
