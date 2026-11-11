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
          <p key={pIdx} className="text-zinc-300 leading-relaxed">
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
                    className={`inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md text-[12px] font-medium transition-colors bg-white/[0.06] hover:bg-white/[0.12] border-b ${
                      isAt
                        ? 'text-zinc-100 border-brass-400/60'
                        : 'text-zinc-100 border-emerald-400/50'
                    }`}
                  >
                    <span>{part}</span>
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
        className={`input-clean w-full rounded-lg px-3.5 py-2.5 text-sm placeholder-zinc-600 ${className}`}
      />

      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-zinc-500">
        <span>Use</span>
        <kbd className="px-1 py-0.5 rounded bg-white/[0.05] text-zinc-400 font-mono text-[10px]">@</kbd>
        <span>ou</span>
        <kbd className="px-1 py-0.5 rounded bg-white/[0.05] text-zinc-400 font-mono text-[10px]">#</kbd>
        <span>para referenciar entradas do códice.</span>
      </div>

      {queryInfo && suggestions.length > 0 && (
        <div className="absolute left-2 bottom-9 z-50 w-72 rounded-xl bg-[#18181d] border border-white/[0.12] shadow-elevated overflow-hidden">
          <div className="px-3 py-1.5 border-b border-white/[0.06] text-[10px] uppercase tracking-wider text-zinc-500 flex items-center justify-between">
            <span>Referenciar entrada</span>
            <span className="font-mono">{queryInfo.prefix}</span>
          </div>
          <div className="max-h-48 overflow-y-auto divide-y divide-white/[0.04]">
            {suggestions.map((ent) => (
              <button
                key={ent.id}
                type="button"
                onClick={() => insertSuggestion(ent.handle, ent.mentionPrefix)}
                className="w-full px-3 py-2 text-left hover:bg-white/[0.06] transition-colors flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {ent.mentionPrefix === '@' ? (
                      <AtSign className="w-3 h-3 text-zinc-400 shrink-0" />
                    ) : (
                      <Hash className="w-3 h-3 text-zinc-400 shrink-0" />
                    )}
                    <span className="text-xs font-mono font-medium text-zinc-100 truncate">
                      {ent.mentionPrefix}
                      {ent.handle}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-500 truncate">
                    {ent.name}
                  </div>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">
                  {ent.category}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
