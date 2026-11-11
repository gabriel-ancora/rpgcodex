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

  // Stronghold Edit & Upgrade Form States
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

  const openStrongholdEditor = () => {
    setShName(partyResources.stronghold.name);
    setShType(partyResources.stronghold.type);
    setShIntegrity(partyResources.stronghold.integrity);
    setShMaxIntegrity(partyResources.stronghold.maxIntegrity);
    setShUpkeep(partyResources.stronghold.upkeepPerMonth);
    setShDesc(partyResources.stronghold.description);
    setIsEditingStronghold(true);
  };

  const handleSaveStronghold = (e: React.FormEvent) => {
    e.preventDefault();
    updateStronghold({
      name: shName.trim() || 'Base da Companhia',
      type: shType.trim() || 'Refúgio',
      integrity: Number(shIntegrity),
      maxIntegrity: Math.max(1, Number(shMaxIntegrity)),
      upkeepPerMonth: shUpkeep.trim() || '0 PO',
      description: shDesc.trim(),
    });
    setIsEditingStronghold(false);
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-7.5rem)] overflow-y-auto pr-1">
      {/* Left Column: Chronicles & Personal Notes */}
      <div className="lg:col-span-6 space-y-4">
        <div className="p-4 rounded-xl surface-panel space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-0.5">
              <h2 className="text-base font-semibold text-zinc-100 tracking-tight">
                {journalTab === 'collective'
                  ? 'Crônicas da campanha'
                  : 'Caderno privado'}
              </h2>
              <p className="text-xs text-zinc-500">
                {journalTab === 'collective'
                  ? 'Relatos colaborativos das sessões compartilhados com toda a mesa.'
                  : 'Anotações individuais com controle de visibilidade para o mestre.'}
              </p>
            </div>

            {journalTab === 'collective' ? (
              <button
                onClick={() => setShowAddJournal(!showAddJournal)}
                className="btn-solid px-3 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo relato</span>
              </button>
            ) : (
              <button
                onClick={() => setShowAddPersonal(!showAddPersonal)}
                className="btn-solid px-3 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova nota</span>
              </button>
            )}
          </div>

          {/* Segmented Control */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#0e0e11] border border-white/[0.06]">
            <button
              onClick={() => setJournalTab('collective')}
              className={`py-1.5 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                journalTab === 'collective'
                  ? 'bg-zinc-100 text-zinc-950'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <BookMarked className="w-3.5 h-3.5" />
              <span>Crônicas ({journal.length})</span>
            </button>
            <button
              onClick={() => setJournalTab('personal')}
              className={`py-1.5 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                journalTab === 'personal'
                  ? 'bg-zinc-100 text-zinc-950'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Notas privadas ({visiblePersonalNotes.length})</span>
            </button>
          </div>
        </div>

        {/* Collective Journal */}
        {journalTab === 'collective' && (
          <>
            {showAddJournal && (
              <form
                onSubmit={handleAddJournal}
                className="p-4 rounded-xl surface-panel space-y-3 text-xs"
              >
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    min={1}
                    value={jSessionNum}
                    onChange={(e) => setJSessionNum(Number(e.target.value))}
                    placeholder="Sessão #"
                    className="input-clean px-2.5 py-1.5 rounded-lg font-mono"
                  />
                  <input
                    type="text"
                    value={jAuthor}
                    onChange={(e) => setJAuthor(e.target.value)}
                    placeholder="Autor ou personagem"
                    className="input-clean col-span-2 px-2.5 py-1.5 rounded-lg"
                  />
                </div>
                <input
                  type="text"
                  required
                  value={jTitle}
                  onChange={(e) => setJTitle(e.target.value)}
                  placeholder="Título da crônica"
                  className="input-clean w-full px-3 py-1.5 rounded-lg"
                />
                <MentionTextarea
                  value={jContent}
                  onChange={setJContent}
                  rows={4}
                  placeholder="Escreva o relato da sessão citando @NPCs e #Locais..."
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddJournal(false)}
                    className="btn-subtle px-3 py-1.5 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-solid px-4 py-1.5 rounded-lg"
                  >
                    Publicar relato
                  </button>
                </div>
              </form>
            )}

            {journal.length === 0 ? (
              <div className="py-12 px-6 rounded-xl surface-panel text-center space-y-2">
                <BookMarked className="w-6 h-6 text-zinc-600 mx-auto" />
                <h3 className="text-sm font-medium text-zinc-300">
                  Nenhuma crônica registrada
                </h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Registre resumos das sessões com menções diretas a personagens e locais.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {journal.map((entry) => (
                  <article
                    key={entry.id}
                    className="p-5 rounded-xl surface-panel space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-white/[0.06] pb-3">
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-mono text-zinc-500 tabular-nums">
                          Sessão {entry.sessionNumber} · {entry.inGameDate}
                        </span>
                        <h3 className="text-xl font-serif font-medium text-zinc-100">
                          {entry.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-[#0e0e11] border border-white/[0.06] text-zinc-400">
                          {entry.author}
                        </span>
                        {viewRole === 'gm' && (
                          <button
                            onClick={() => deleteJournalEntry(entry.id)}
                            className="p-1 rounded text-zinc-600 hover:text-rose-400"
                            title="Remover crônica"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="text-sm text-zinc-300 leading-relaxed">
                      <MentionText text={entry.content} />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}

        {/* Personal Notes */}
        {journalTab === 'personal' && (
          <>
            {isStrictDmView && (
              <div className="p-3.5 rounded-xl bg-[#0e0e11] border border-white/[0.07] text-xs text-zinc-400 flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-zinc-500 shrink-0" />
                <span>
                  Exibindo apenas anotações pessoais compartilhadas voluntariamente com o mestre.
                </span>
              </div>
            )}

            {showAddPersonal && (
              <form
                onSubmit={handleAddPersonalNote}
                className="p-4 rounded-xl surface-panel space-y-3 text-xs"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    required
                    value={pTitle}
                    onChange={(e) => setPTitle(e.target.value)}
                    placeholder="Título da nota..."
                    className="input-clean px-3 py-1.5 rounded-lg"
                  />
                  <input
                    type="text"
                    value={pCharacterName}
                    onChange={(e) => setPCharacterName(e.target.value)}
                    placeholder="Personagem"
                    className="input-clean px-3 py-1.5 rounded-lg"
                  />
                  <select
                    value={pCategory}
                    onChange={(e) =>
                      setPCategory(
                        e.target.value as PersonalJournalNote['category']
                      )
                    }
                    className="input-clean px-3 py-1.5 rounded-lg"
                  >
                    <option value="theory">Teoria / Investigação</option>
                    <option value="secret">Segredo pessoal</option>
                    <option value="backstory">Prelúdio</option>
                    <option value="goal">Objetivo</option>
                  </select>
                </div>

                <MentionTextarea
                  value={pContent}
                  onChange={setPContent}
                  rows={4}
                  placeholder="Anotações privadas, suspeitas ou planos (@NPC, #Local)..."
                />

                <label className="flex items-center gap-2 cursor-pointer select-none text-zinc-400 p-2.5 rounded-lg bg-[#0e0e11] border border-white/[0.06]">
                  <input
                    type="checkbox"
                    checked={pShareWithDm}
                    onChange={(e) => setPShareWithDm(e.target.checked)}
                  />
                  <span>Permitir leitura pelo mestre</span>
                </label>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddPersonal(false)}
                    className="btn-subtle px-3 py-1.5 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-solid px-4 py-1.5 rounded-lg"
                  >
                    Salvar nota
                  </button>
                </div>
              </form>
            )}

            {visiblePersonalNotes.length === 0 ? (
              <div className="py-12 px-6 rounded-xl surface-panel text-center space-y-2">
                <FileLock2 className="w-6 h-6 text-zinc-600 mx-auto" />
                <h3 className="text-sm font-medium text-zinc-300">
                  Nenhuma nota privada visível
                </h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Registre teorias ou segredos individuais do seu personagem com privacidade garantida.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {visiblePersonalNotes.map((note) => (
                  <article
                    key={note.id}
                    className="p-4 rounded-xl surface-panel space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-white/[0.06] pb-2.5">
                      <div>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                          <span className="inline-flex items-center gap-1 text-zinc-300 font-medium">
                            <Lock className="w-3 h-3 text-zinc-500" />
                            {note.characterName}
                          </span>
                          <span>·</span>
                          <span className="font-mono">{note.updatedAt}</span>
                        </div>
                        <h3 className="text-lg font-serif font-medium text-zinc-100 mt-0.5">
                          {note.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => togglePersonalNoteDmAccess(note.id)}
                          className="btn-subtle px-2.5 py-1 rounded-md text-[11px] inline-flex items-center gap-1"
                          title="Alternar visibilidade para o mestre"
                        >
                          {note.sharedWithDm ? (
                            <>
                              <Eye className="w-3 h-3 text-emerald-400" />
                              <span>Visível ao mestre</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3 text-zinc-500" />
                              <span>Privado</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => deletePersonalJournalNote(note.id)}
                          className="p-1.5 rounded-md text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10"
                          title="Excluir nota"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="text-sm text-zinc-300 leading-relaxed">
                      <MentionText text={note.content} />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Right Column: Treasury, Stronghold & Shared Inventory */}
      <div className="lg:col-span-6 space-y-4">
        {/* Treasury & Supplies */}
        <div className="p-5 rounded-xl surface-panel space-y-3.5">
          <div className="flex items-center gap-2 text-zinc-200">
            <Coins className="w-4 h-4 text-zinc-400" />
            <h3 className="text-sm font-semibold tracking-tight">
              Tesouro & suprimentos
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {(
              [
                { key: 'gold', label: 'Ouro (PO)', step: 10 },
                { key: 'silver', label: 'Prata (PP)', step: 5 },
                { key: 'copper', label: 'Cobre (PC)', step: 10 },
                { key: 'rations', label: 'Rações', step: 1 },
                { key: 'torches', label: 'Tochas & óleo', step: 1 },
                { key: 'healerKits', label: 'Kits médicos', step: 1 },
              ] as const
            ).map((res) => (
              <div
                key={res.key}
                className="p-3 rounded-xl bg-[#0e0e11] border border-white/[0.06] flex flex-col justify-between gap-2"
              >
                <div className="text-[11px] text-zinc-500">{res.label}</div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-mono font-semibold text-zinc-100 tabular-nums">
                    {partyResources[res.key]}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => adjustPartyCurrency(res.key, -res.step)}
                      className="btn-subtle p-1 rounded"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => adjustPartyCurrency(res.key, res.step)}
                      className="btn-subtle p-1 rounded"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Party Stronghold */}
        <div className="p-5 rounded-xl surface-panel space-y-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Castle className="w-4 h-4 text-zinc-400 shrink-0" />
              <div>
                <span className="text-[11px] text-zinc-500 block">
                  {partyResources.stronghold.type} · Manutenção {partyResources.stronghold.upkeepPerMonth}
                </span>
                <h3 className="text-base font-serif font-medium text-zinc-100">
                  {partyResources.stronghold.name}
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#0e0e11] text-zinc-300 border border-white/[0.06] tabular-nums">
                {partyResources.stronghold.integrity}/
                {partyResources.stronghold.maxIntegrity}
              </span>
              <button
                type="button"
                onClick={() =>
                  isEditingStronghold
                    ? setIsEditingStronghold(false)
                    : openStrongholdEditor()
                }
                className="btn-subtle p-1.5 rounded-md"
                title="Editar base de operações"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {isEditingStronghold ? (
            <form
              onSubmit={handleSaveStronghold}
              className="p-3.5 rounded-xl bg-[#0e0e11] border border-white/[0.08] space-y-2.5 text-xs"
            >
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-500 block mb-1">Nome da base</label>
                  <input
                    type="text"
                    required
                    value={shName}
                    onChange={(e) => setShName(e.target.value)}
                    className="input-clean w-full px-2.5 py-1.5 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 block mb-1">Tipo</label>
                  <input
                    type="text"
                    value={shType}
                    onChange={(e) => setShType(e.target.value)}
                    placeholder="Ex: Fortaleza, Navio, Torre..."
                    className="input-clean w-full px-2.5 py-1.5 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-500 block mb-1">Integridade</label>
                  <input
                    type="number"
                    value={shIntegrity}
                    onChange={(e) => setShIntegrity(Number(e.target.value))}
                    className="input-clean w-full px-2.5 py-1.5 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 block mb-1">Máx</label>
                  <input
                    type="number"
                    min={1}
                    value={shMaxIntegrity}
                    onChange={(e) => setShMaxIntegrity(Number(e.target.value))}
                    className="input-clean w-full px-2.5 py-1.5 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 block mb-1">Manutenção</label>
                  <input
                    type="text"
                    value={shUpkeep}
                    onChange={(e) => setShUpkeep(e.target.value)}
                    placeholder="15 PO/mês"
                    className="input-clean w-full px-2.5 py-1.5 rounded-lg font-mono"
                  />
                </div>
              </div>
              <MentionTextarea
                value={shDesc}
                onChange={setShDesc}
                rows={2}
                placeholder="Descrição da base (@NPCs, #Local)..."
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingStronghold(false)}
                  className="btn-subtle px-3 py-1 rounded-lg"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-solid px-3.5 py-1 rounded-lg">
                  Salvar base
                </button>
              </div>
            </form>
          ) : (
            <div className="text-xs text-zinc-300 leading-relaxed">
              <MentionText text={partyResources.stronghold.description} />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <span>Melhorias da base</span>
              <button
                type="button"
                onClick={() => setShowAddUpgrade(!showAddUpgrade)}
                className="text-zinc-300 hover:text-white inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Nova melhoria</span>
              </button>
            </div>

            {showAddUpgrade && (
              <form
                onSubmit={handleCreateUpgrade}
                className="p-3 rounded-xl bg-[#0e0e11] border border-white/[0.08] space-y-2 text-xs"
              >
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    required
                    value={upgName}
                    onChange={(e) => setUpgName(e.target.value)}
                    placeholder="Nome da melhoria"
                    className="input-clean col-span-2 px-2.5 py-1.5 rounded-lg"
                  />
                  <input
                    type="text"
                    value={upgCost}
                    onChange={(e) => setUpgCost(e.target.value)}
                    placeholder="Custo (ex: 50 PO)"
                    className="input-clean px-2.5 py-1.5 rounded-lg font-mono"
                  />
                </div>
                <input
                  type="text"
                  value={upgBenefit}
                  onChange={(e) => setUpgBenefit(e.target.value)}
                  placeholder="Benefício mecânico ou narrativo..."
                  className="input-clean w-full px-2.5 py-1.5 rounded-lg"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddUpgrade(false)}
                    className="btn-subtle px-2.5 py-1 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn-solid px-3 py-1 rounded-lg">
                    Adicionar
                  </button>
                </div>
              </form>
            )}

            {partyResources.stronghold.upgrades.length === 0 ? (
              <p className="text-xs text-zinc-500 py-2">
                Nenhuma melhoria cadastrada ainda.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {partyResources.stronghold.upgrades.map((upg) => (
                  <div
                    key={upg.id}
                    onClick={() => toggleStrongholdUpgrade(upg.id)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-colors space-y-1 group ${
                      upg.installed
                        ? 'bg-emerald-500/[0.04] border-emerald-500/25 text-zinc-100'
                        : 'bg-[#0e0e11] border-white/[0.06] text-zinc-400 hover:border-white/[0.14]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 font-medium">
                      <span className="flex items-center gap-1.5 min-w-0">
                        {upg.installed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                        )}
                        <span className="truncate">{upg.name}</span>
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] font-mono text-zinc-400">
                          {upg.cost}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeStrongholdUpgrade(upg.id);
                          }}
                          className="p-0.5 text-zinc-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remover melhoria"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-zinc-500 pl-5 leading-snug">
                      {upg.benefit}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Shared Party Inventory */}
        <div className="p-5 rounded-xl surface-panel space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-zinc-200">
              <Backpack className="w-4 h-4 text-zinc-400" />
              <h3 className="text-sm font-semibold tracking-tight">
                Espólio & provas do grupo
              </h3>
            </div>
            <span className="text-xs font-mono text-zinc-500 tabular-nums">
              {partyResources.items.length}
            </span>
          </div>

          {partyResources.items.length === 0 ? (
            <p className="text-xs text-zinc-500 py-1">
              Nenhum item registrado no inventário coletivo.
            </p>
          ) : (
            <div className="space-y-2">
              {partyResources.items.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-[#0e0e11] border border-white/[0.06] flex items-start justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-medium text-zinc-100 flex items-center gap-2">
                      <span>
                        {item.quantity}× {item.name}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-400">
                        {item.holder}
                      </span>
                    </div>
                    <div className="text-zinc-500">
                      <MentionText text={item.notes} />
                    </div>
                  </div>
                  <button
                    onClick={() => removePartyInventoryItem(item.id)}
                    className="text-zinc-600 hover:text-rose-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form
            onSubmit={handleAddItem}
            className="pt-3 border-t border-white/[0.06] space-y-2 text-xs"
          >
            <div className="grid grid-cols-1 sm:grid-cols-6 gap-2">
              <input
                type="number"
                min={1}
                value={itemQty}
                onChange={(e) => setItemQty(Number(e.target.value))}
                title="Quantidade"
                className="input-clean px-2.5 py-1.5 rounded-lg font-mono"
              />
              <input
                type="text"
                required
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="Novo item ou prova..."
                className="input-clean sm:col-span-3 px-2.5 py-1.5 rounded-lg"
              />
              <input
                type="text"
                value={itemHolder}
                onChange={(e) => setItemHolder(e.target.value)}
                placeholder="Portador"
                className="input-clean sm:col-span-2 px-2.5 py-1.5 rounded-lg"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={itemNotes}
                onChange={(e) => setItemNotes(e.target.value)}
                placeholder="Notas opcionais (@NPC, #Local)..."
                className="input-clean flex-1 px-2.5 py-1.5 rounded-lg"
              />
              <button
                type="submit"
                className="btn-solid px-4 py-1.5 rounded-lg text-xs shrink-0"
              >
                Adicionar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
