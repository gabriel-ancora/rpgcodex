import React, { useState, useEffect } from 'react';
import { useCampaignStore } from '../../store/useCampaignStore';
import { MentionText, MentionTextarea } from '../common/MentionText';
import { PersonalJournalNote } from '../../types/campaign';
import {
  BookMarked,
  Coins,
  Backpack,
  Castle,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Circle,
  Lock,
  Eye,
  EyeOff,
  FileLock2,
  Pencil,
} from 'lucide-react';

export const JournalInventoryView: React.FC = () => {
  const journal = useCampaignStore((s) => s.journal);
  const personalJournalNotes = useCampaignStore((s) => s.personalJournalNotes);
  const partyResources = useCampaignStore((s) => s.partyResources);
  const calendar = useCampaignStore((s) => s.calendar);
  const currentUser = useCampaignStore((s) => s.currentUser);
  const viewRole = useCampaignStore((s) => s.viewRole);
  const characterSheets = useCampaignStore((s) => s.characterSheets);
  const activeCharacterId = useCampaignStore((s) => s.activeCharacterId);

  const addJournalEntry = useCampaignStore((s) => s.addJournalEntry);
  const updateJournalEntry = useCampaignStore((s) => s.updateJournalEntry);
  const deleteJournalEntry = useCampaignStore((s) => s.deleteJournalEntry);
  const addPersonalJournalNote = useCampaignStore(
    (s) => s.addPersonalJournalNote
  );
  const togglePersonalNoteDmAccess = useCampaignStore(
    (s) => s.togglePersonalNoteDmAccess
  );
  const deletePersonalJournalNote = useCampaignStore(
    (s) => s.deletePersonalJournalNote
  );

  const adjustPartyCurrency = useCampaignStore((s) => s.adjustPartyCurrency);
  const addPartyInventoryItem = useCampaignStore(
    (s) => s.addPartyInventoryItem
  );
  const removePartyInventoryItem = useCampaignStore(
    (s) => s.removePartyInventoryItem
  );
  const toggleStrongholdUpgrade = useCampaignStore(
    (s) => s.toggleStrongholdUpgrade
  );
  const updateStronghold = useCampaignStore((s) => s.updateStronghold);
  const addStrongholdUpgrade = useCampaignStore((s) => s.addStrongholdUpgrade);
  const removeStrongholdUpgrade = useCampaignStore((s) => s.removeStrongholdUpgrade);

  const activeChar = characterSheets.find((c) => c.id === activeCharacterId) || characterSheets[0];

  const [journalTab, setJournalTab] = useState<'collective' | 'personal'>(
    'collective'
  );

  const [showAddJournal, setShowAddJournal] = useState(false);
  const [jSessionNum, setJSessionNum] = useState(journal.length + 1);
  const [jTitle, setJTitle] = useState('');
  const [jAuthor, setJAuthor] = useState('');
  const [jContent, setJContent] = useState('');

  const [showAddPersonal, setShowAddPersonal] = useState(false);
  const [pTitle, setPTitle] = useState('');
  const [pCharacterName, setPCharacterName] = useState(
    activeChar?.name || currentUser?.name || ''
  );
  const [pCategory, setPCategory] =
    useState<PersonalJournalNote['category']>('theory');
  const [pContent, setPContent] = useState('');
  const [pShareWithDm, setPShareWithDm] = useState(false);

  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [itemHolder, setItemHolder] = useState('');
  const [itemNotes, setItemNotes] = useState('');

  // Edição da base e formulário de melhorias
  const [isEditingStronghold, setIsEditingStronghold] = useState(false);
  const [shName, setShName] = useState(partyResources.stronghold.name);
  const [shType, setShType] = useState(partyResources.stronghold.type);
  const [shIntegrity, setShIntegrity] = useState(partyResources.stronghold.integrity);
  const [shMaxIntegrity, setShMaxIntegrity] = useState(partyResources.stronghold.maxIntegrity);
  const [shUpkeep, setShUpkeep] = useState(partyResources.stronghold.upkeepPerMonth);
  const [shDesc, setShDesc] = useState(partyResources.stronghold.description);

  const [showAddUpgrade, setShowAddUpgrade] = useState(false);
  const [upgName, setUpgName] = useState('');
  const [upgCost, setUpgCost] = useState('');
  const [upgBenefit, setUpgBenefit] = useState('');

  useEffect(() => {
    setJSessionNum(journal.length + 1);
  }, [journal.length]);

  useEffect(() => {
    if (!pCharacterName && (activeChar?.name || currentUser?.name)) {
      setPCharacterName(activeChar?.name || currentUser?.name || '');
    }
  }, [activeChar?.name, currentUser?.name, pCharacterName]);

  const openStrongholdEditor = (creating = false) => {
    setShName(creating ? '' : partyResources.stronghold.name);
    setShType(creating ? '' : partyResources.stronghold.type);
    setShIntegrity(creating ? 100 : partyResources.stronghold.integrity);
    setShMaxIntegrity(creating ? 100 : partyResources.stronghold.maxIntegrity);
    setShUpkeep(creating ? '' : partyResources.stronghold.upkeepPerMonth);
    setShDesc(creating ? '' : partyResources.stronghold.description);
    setIsEditingStronghold(true);
  };

  const handleSaveStronghold = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shName.trim()) return;
    updateStronghold({
      name: shName.trim(),
      type: shType.trim() || 'Refúgio',
      integrity: Number(shIntegrity),
      maxIntegrity: Math.max(1, Number(shMaxIntegrity)),
      upkeepPerMonth: shUpkeep.trim() || '0 PO',
      description: shDesc.trim(),
    });
    setIsEditingStronghold(false);
  };

  const handleRemoveStronghold = () => {
    updateStronghold({
      name: '',
      type: '',
      integrity: 100,
      maxIntegrity: 100,
      upkeepPerMonth: '',
      description: '',
    });
    setIsEditingStronghold(false);
    setShowAddUpgrade(false);
  };

  const handleCreateUpgrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!upgName.trim()) return;
    addStrongholdUpgrade(
      upgName.trim(),
      upgCost.trim() || '50 PO',
      upgBenefit.trim() || 'Benefício passivo para o grupo.'
    );
    setUpgName('');
    setUpgCost('');
    setUpgBenefit('');
    setShowAddUpgrade(false);
  };

  const handleAddJournal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jTitle.trim() || !jContent.trim()) return;
    const monthName =
      calendar.months[calendar.currentMonthIndex]?.name || 'Mês 1';

    addJournalEntry({
      sessionNumber: Number(jSessionNum),
      title: jTitle.trim(),
      inGameDate: `${calendar.currentDay} de ${monthName}, ${calendar.currentYear} (${calendar.epochName})`,
      author: jAuthor.trim() || activeChar?.name || currentUser?.name || 'Grupo',
      content: jContent.trim(),
      isPublic: true,
    });
    setJTitle('');
    setJContent('');
    setShowAddJournal(false);
  };

  const handleAddPersonalNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pTitle.trim() || !pContent.trim()) return;
    addPersonalJournalNote({
      playerId: currentUser?.id || '',
      playerName: currentUser?.name || 'Jogador',
      characterName: pCharacterName.trim() || currentUser?.name || 'Personagem',
      title: pTitle.trim(),
      content: pContent.trim(),
      category: pCategory,
      sharedWithDm: pShareWithDm,
    });
    setPTitle('');
    setPContent('');
    setPShareWithDm(false);
    setShowAddPersonal(false);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;
    addPartyInventoryItem(
      itemName.trim(),
      Math.max(1, Number(itemQty)),
      itemHolder.trim() || 'Grupo',
      'treasure',
      itemNotes.trim() || 'Registrado no espólio coletivo.'
    );
    setItemName('');
    setItemQty(1);
    setItemNotes('');
  };

  const campaigns = useCampaignStore((s) => s.campaigns);
  const activeCampaignId = useCampaignStore((s) => s.activeCampaignId);
  const activeCamp = campaigns.find((c) => c.id === activeCampaignId);
  const isStrictDmView = viewRole === 'gm' && activeCamp?.isDm !== false;
  const visiblePersonalNotes = personalJournalNotes.filter((n) =>
    isStrictDmView
      ? n.sharedWithDm || n.playerId === currentUser?.id
      : true
  );

  const sh = partyResources.stronghold;
  const isLegacyDefaultStronghold =
    sh.name === 'Base da Companhia' &&
    sh.description === 'Configure o nome, descrição e melhorias da base de operações do grupo.' &&
    sh.upgrades.length === 0;
  const hasStronghold = Boolean(sh.name.trim()) && !isLegacyDefaultStronghold;
  const integrityPct = Math.max(
    0,
    Math.min(100, Math.round((sh.integrity / Math.max(1, sh.maxIntegrity)) * 100))
  );
  const integrityFill =
    integrityPct <= 25 ? 'bg-danger' : integrityPct <= 50 ? 'bg-warning' : 'bg-success';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-7.5rem)] overflow-y-auto pr-1 content-start">
      {/* Coluna esquerda: diário e notas pessoais */}
      <div className="lg:col-span-6 space-y-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="section-title">
                {journalTab === 'collective' ? 'Diário da campanha' : 'Notas pessoais'}
              </h2>
              <p className="text-[13px] text-fg-muted">
                {journalTab === 'collective'
                  ? 'Resumos das sessões compartilhados com a mesa.'
                  : 'Anotações individuais com controle de acesso do mestre.'}
              </p>
            </div>

            {journalTab === 'collective' ? (
              <button
                onClick={() => setShowAddJournal(!showAddJournal)}
                className="btn btn-primary btn-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Novo registro</span>
              </button>
            ) : (
              <button
                onClick={() => setShowAddPersonal(!showAddPersonal)}
                className="btn btn-primary btn-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Nova nota</span>
              </button>
            )}
          </div>

          <div className="segmented w-full">
            <button
              onClick={() => setJournalTab('collective')}
              className={`segmented-item flex-1 inline-flex items-center justify-center gap-1.5 ${
                journalTab === 'collective' ? 'segmented-item-active' : ''
              }`}
            >
              <BookMarked className="w-4 h-4" />
              <span>Diário</span>
              <span className="tabular-nums text-fg-subtle">{journal.length}</span>
            </button>
            <button
              onClick={() => setJournalTab('personal')}
              className={`segmented-item flex-1 inline-flex items-center justify-center gap-1.5 ${
                journalTab === 'personal' ? 'segmented-item-active' : ''
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>Notas pessoais</span>
              <span className="tabular-nums text-fg-subtle">{visiblePersonalNotes.length}</span>
            </button>
          </div>
        </div>

        {/* Diário coletivo */}
        {journalTab === 'collective' && (
          <>
            {showAddJournal && (
              <form onSubmit={handleAddJournal} className="card p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="label">Sessão</label>
                    <input
                      type="number"
                      min={1}
                      value={jSessionNum}
                      onChange={(e) => setJSessionNum(Number(e.target.value))}
                      className="input tabular-nums"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Autor</label>
                    <input
                      type="text"
                      value={jAuthor}
                      onChange={(e) => setJAuthor(e.target.value)}
                      placeholder="Jogador ou personagem"
                      className="input"
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Título</label>
                  <input
                    type="text"
                    required
                    value={jTitle}
                    onChange={(e) => setJTitle(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Resumo</label>
                  <MentionTextarea
                    value={jContent}
                    onChange={setJContent}
                    rows={4}
                    placeholder="Suporta @NPC e #Local"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddJournal(false)}
                    className="btn btn-secondary btn-sm"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm">
                    Publicar
                  </button>
                </div>
              </form>
            )}

            {journal.length === 0 ? (
              <div className="card py-12 px-6 text-center">
                <BookMarked className="w-5 h-5 text-fg-subtle mx-auto mb-3" />
                <h3 className="text-sm font-medium text-fg">Nenhum registro</h3>
                <p className="text-[13px] text-fg-muted max-w-sm mx-auto mt-1">
                  Registre resumos das sessões citando personagens e locais.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {journal.map((entry) => (
                  <article key={entry.id} className="card p-4 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-xs text-fg-subtle tabular-nums">
                          Sessão {entry.sessionNumber} · {entry.inGameDate}
                        </span>
                        <h3 className="text-base font-semibold text-fg">{entry.title}</h3>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {!entry.isPublic && (
                          <span className="badge badge-warning">Oculto</span>
                        )}
                        <span className="badge">{entry.author}</span>
                        {viewRole === 'gm' && (
                          <>
                            <button
                              onClick={() =>
                                void updateJournalEntry(entry.id, {
                                  isPublic: !entry.isPublic,
                                })
                              }
                              className="btn btn-ghost btn-sm btn-icon"
                              title={
                                entry.isPublic
                                  ? 'Ocultar dos jogadores'
                                  : 'Revelar aos jogadores'
                              }
                            >
                              {entry.isPublic ? (
                                <Eye className="w-4 h-4" />
                              ) : (
                                <EyeOff className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => deleteJournalEntry(entry.id)}
                              className="btn btn-danger-ghost btn-sm btn-icon"
                              title="Excluir registro"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-sm text-fg leading-relaxed">
                      <MentionText text={entry.content} />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}

        {/* Notas pessoais */}
        {journalTab === 'personal' && (
          <>
            {isStrictDmView && (
              <div className="card-muted px-3 py-2.5 text-[13px] text-fg-muted flex items-center gap-2">
                <Lock className="w-4 h-4 text-fg-subtle shrink-0" />
                <span>Exibindo apenas notas que os jogadores compartilharam com o mestre.</span>
              </div>
            )}

            {showAddPersonal && (
              <form onSubmit={handleAddPersonalNote} className="card p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="label">Título</label>
                    <input
                      type="text"
                      required
                      value={pTitle}
                      onChange={(e) => setPTitle(e.target.value)}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Personagem</label>
                    <input
                      type="text"
                      value={pCharacterName}
                      onChange={(e) => setPCharacterName(e.target.value)}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Categoria</label>
                    <select
                      value={pCategory}
                      onChange={(e) =>
                        setPCategory(e.target.value as PersonalJournalNote['category'])
                      }
                      className="input"
                    >
                      <option value="theory">Teoria</option>
                      <option value="secret">Segredo pessoal</option>
                      <option value="backstory">Antecedente</option>
                      <option value="goal">Objetivo</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">Conteúdo</label>
                  <MentionTextarea
                    value={pContent}
                    onChange={setPContent}
                    rows={4}
                    placeholder="Suspeitas, planos ou segredos. Suporta @NPC e #Local."
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-fg-muted">
                  <input
                    type="checkbox"
                    checked={pShareWithDm}
                    onChange={(e) => setPShareWithDm(e.target.checked)}
                    className="checkbox"
                  />
                  <span>Permitir leitura pelo mestre</span>
                </label>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddPersonal(false)}
                    className="btn btn-secondary btn-sm"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm">
                    Salvar nota
                  </button>
                </div>
              </form>
            )}

            {visiblePersonalNotes.length === 0 ? (
              <div className="card py-12 px-6 text-center">
                <FileLock2 className="w-5 h-5 text-fg-subtle mx-auto mb-3" />
                <h3 className="text-sm font-medium text-fg">Nenhuma nota visível</h3>
                <p className="text-[13px] text-fg-muted max-w-sm mx-auto mt-1">
                  Registre teorias ou segredos do seu personagem. As notas são privadas por padrão.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {visiblePersonalNotes.map((note) => (
                  <article key={note.id} className="card p-4 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-xs text-fg-subtle">
                          <span className="font-medium text-fg-muted">{note.characterName}</span>
                          <span>·</span>
                          <span className="tabular-nums">{note.updatedAt}</span>
                        </div>
                        <h3 className="text-base font-semibold text-fg">{note.title}</h3>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => togglePersonalNoteDmAccess(note.id)}
                          className="btn btn-secondary btn-sm"
                          title="Alternar visibilidade para o mestre"
                        >
                          {note.sharedWithDm ? (
                            <>
                              <Eye className="w-4 h-4" />
                              <span>Visível ao mestre</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-4 h-4" />
                              <span>Privada</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => deletePersonalJournalNote(note.id)}
                          className="btn btn-danger-ghost btn-sm btn-icon"
                          title="Excluir nota"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="text-sm text-fg leading-relaxed">
                      <MentionText text={note.content} />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Coluna direita: tesouro, base e inventário */}
      <div className="lg:col-span-6 space-y-4">
        {/* Tesouro e suprimentos */}
        <section className="card">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
            <Coins className="w-4 h-4 text-fg-muted" />
            <h3 className="section-title">Tesouro e suprimentos</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 divide-line">
            {(
              [
                { key: 'gold', label: 'Ouro (PO)', step: 10 },
                { key: 'silver', label: 'Prata (PP)', step: 5 },
                { key: 'copper', label: 'Cobre (PC)', step: 10 },
                { key: 'rations', label: 'Rações', step: 1 },
                { key: 'torches', label: 'Tochas e óleo', step: 1 },
                { key: 'healerKits', label: 'Kits de cura', step: 1 },
              ] as const
            ).map((res) => (
              <div
                key={res.key}
                className="px-4 py-3 border-b border-r border-line flex flex-col gap-1.5"
              >
                <div className="text-xs text-fg-subtle">{res.label}</div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-lg font-semibold text-fg tabular-nums">
                    {partyResources[res.key]}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => adjustPartyCurrency(res.key, -res.step)}
                      className="btn btn-ghost btn-icon h-7 w-7"
                      title={`-${res.step}`}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => adjustPartyCurrency(res.key, res.step)}
                      className="btn btn-ghost btn-icon h-7 w-7"
                      title={`+${res.step}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Base do grupo (opcional: criada pelo Mestre se a campanha tiver uma) */}
        {(hasStronghold || isEditingStronghold || isStrictDmView) && (
          <section className="card">
            {!hasStronghold && !isEditingStronghold ? (
              <div className="px-4 py-4 flex items-center justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <Castle className="w-4 h-4 text-fg-subtle shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <h3 className="section-title">Base do grupo</h3>
                    <p className="text-xs text-fg-muted mt-0.5">
                      Opcional. Crie uma base se o grupo tiver um refúgio, fortaleza ou navio.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openStrongholdEditor(true)}
                  className="btn btn-secondary btn-sm shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Criar base</span>
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2 px-4 py-3 border-b border-line">
                  <div className="flex items-start gap-2 min-w-0">
                    <Castle className="w-4 h-4 text-fg-muted shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <h3 className="section-title truncate">
                        {hasStronghold ? sh.name : 'Nova base do grupo'}
                      </h3>
                      {hasStronghold && (
                        <span className="text-xs text-fg-subtle">
                          {sh.type} · Manutenção {sh.upkeepPerMonth}
                        </span>
                      )}
                    </div>
                  </div>
                  {isStrictDmView && hasStronghold && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          isEditingStronghold
                            ? setIsEditingStronghold(false)
                            : openStrongholdEditor(false)
                        }
                        className="btn btn-ghost btn-sm btn-icon"
                        title="Editar base"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveStronghold}
                        className="btn btn-danger-ghost btn-sm btn-icon"
                        title="Remover base"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-4">
                  {hasStronghold && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-fg-muted font-medium">Integridade</span>
                        <span className="tabular-nums text-fg">
                          {sh.integrity}/{sh.maxIntegrity}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                        <div
                          className={`h-full transition-all ${integrityFill}`}
                          style={{ width: `${integrityPct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {isEditingStronghold ? (
                    <form onSubmit={handleSaveStronghold} className="card-muted p-3 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="label">Nome</label>
                          <input
                            type="text"
                            required
                            value={shName}
                            onChange={(e) => setShName(e.target.value)}
                            placeholder="Ex.: Bastilha de Pedra"
                            className="input"
                          />
                        </div>
                        <div>
                          <label className="label">Tipo</label>
                          <input
                            type="text"
                            value={shType}
                            onChange={(e) => setShType(e.target.value)}
                            placeholder="Ex.: Fortaleza, navio, torre"
                            className="input"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="label">Integridade</label>
                          <input
                            type="number"
                            value={shIntegrity}
                            onChange={(e) => setShIntegrity(Number(e.target.value))}
                            className="input tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="label">Máximo</label>
                          <input
                            type="number"
                            min={1}
                            value={shMaxIntegrity}
                            onChange={(e) => setShMaxIntegrity(Number(e.target.value))}
                            className="input tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="label">Manutenção</label>
                          <input
                            type="text"
                            value={shUpkeep}
                            onChange={(e) => setShUpkeep(e.target.value)}
                            placeholder="15 PO/mês"
                            className="input"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="label">Descrição</label>
                        <MentionTextarea
                          value={shDesc}
                          onChange={setShDesc}
                          rows={2}
                          placeholder="Suporta @NPC e #Local"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingStronghold(false)}
                          className="btn btn-secondary btn-sm"
                        >
                          Cancelar
                        </button>
                        <button type="submit" className="btn btn-primary btn-sm">
                          {hasStronghold ? 'Salvar' : 'Criar base'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    sh.description && (
                      <div className="text-sm text-fg leading-relaxed">
                        <MentionText text={sh.description} />
                      </div>
                    )
                  )}

                  {hasStronghold && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-medium text-fg-muted">Melhorias</span>
                        {isStrictDmView && (
                          <button
                            type="button"
                            onClick={() => setShowAddUpgrade(!showAddUpgrade)}
                            className="btn btn-ghost btn-sm"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Adicionar</span>
                          </button>
                        )}
                      </div>

              {showAddUpgrade && (
                <form onSubmit={handleCreateUpgrade} className="card-muted p-3 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      required
                      value={upgName}
                      onChange={(e) => setUpgName(e.target.value)}
                      placeholder="Nome"
                      className="input col-span-2"
                    />
                    <input
                      type="text"
                      value={upgCost}
                      onChange={(e) => setUpgCost(e.target.value)}
                      placeholder="Custo (50 PO)"
                      className="input"
                    />
                  </div>
                  <input
                    type="text"
                    value={upgBenefit}
                    onChange={(e) => setUpgBenefit(e.target.value)}
                    placeholder="Benefício mecânico ou narrativo"
                    className="input"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddUpgrade(false)}
                      className="btn btn-secondary btn-sm"
                    >
                      Cancelar
                    </button>
                    <button type="submit" className="btn btn-primary btn-sm">
                      Adicionar
                    </button>
                  </div>
                </form>
              )}

              {sh.upgrades.length === 0 ? (
                <p className="text-[13px] text-fg-subtle py-1">Nenhuma melhoria cadastrada.</p>
              ) : (
                <ul className="rounded-md border border-line divide-y divide-line overflow-hidden">
                  {sh.upgrades.map((upg) => (
                    <li
                      key={upg.id}
                      onClick={() => toggleStrongholdUpgrade(upg.id)}
                      className="px-3 py-2 cursor-pointer hover:bg-surface-2 transition-colors group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`flex items-center gap-2 min-w-0 text-sm font-medium ${
                            upg.installed ? 'text-fg' : 'text-fg-muted'
                          }`}
                        >
                          {upg.installed ? (
                            <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-fg-subtle shrink-0" />
                          )}
                          <span className="truncate">{upg.name}</span>
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-xs tabular-nums text-fg-subtle">{upg.cost}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeStrongholdUpgrade(upg.id);
                            }}
                            className="btn btn-danger-ghost btn-icon h-7 w-7 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity"
                            title="Remover melhoria"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-fg-subtle pl-6 leading-snug">{upg.benefit}</p>
                    </li>
                  ))}
                </ul>
              )}
                  </div>
                  )}
                </div>
              </>
            )}
          </section>
        )}

        {/* Inventário do grupo */}
        <section className="card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <div className="flex items-center gap-2">
              <Backpack className="w-4 h-4 text-fg-muted" />
              <h3 className="section-title">Inventário do grupo</h3>
            </div>
            <span className="text-xs text-fg-subtle tabular-nums">
              {partyResources.items.length} itens
            </span>
          </div>

          {partyResources.items.length === 0 ? (
            <p className="text-[13px] text-fg-subtle px-4 py-3">
              Nenhum item no inventário do grupo.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {partyResources.items.map((item) => (
                <li key={item.id} className="px-4 py-2.5 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-fg flex flex-wrap items-center gap-2">
                      <span>
                        <span className="tabular-nums text-fg-muted">{item.quantity}×</span>{' '}
                        {item.name}
                      </span>
                      <span className="badge">{item.holder}</span>
                    </div>
                    <div className="text-[13px] text-fg-muted">
                      <MentionText text={item.notes} />
                    </div>
                  </div>
                  <button
                    onClick={() => removePartyInventoryItem(item.id)}
                    className="btn btn-danger-ghost btn-sm btn-icon shrink-0"
                    title="Remover item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleAddItem} className="p-4 border-t border-line space-y-2 bg-surface-2 rounded-b-lg">
            <div className="grid grid-cols-6 gap-2">
              <input
                type="number"
                min={1}
                value={itemQty}
                onChange={(e) => setItemQty(Number(e.target.value))}
                title="Quantidade"
                aria-label="Quantidade"
                className="input col-span-2 sm:col-span-1 tabular-nums"
              />
              <input
                type="text"
                required
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="Item"
                className="input col-span-4 sm:col-span-3"
              />
              <input
                type="text"
                value={itemHolder}
                onChange={(e) => setItemHolder(e.target.value)}
                placeholder="Portador"
                className="input col-span-6 sm:col-span-2"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={itemNotes}
                onChange={(e) => setItemNotes(e.target.value)}
                placeholder="Notas (opcional)"
                className="input flex-1"
              />
              <button type="submit" className="btn btn-primary shrink-0">
                Adicionar
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};
