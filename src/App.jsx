import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  LayoutDashboard, 
  FileText, 
  ArrowLeft, 
  Search,
  Bell,
  BarChart2,
  Settings,
  ChevronRight,
  Edit2,
  BookOpen,
  MoreHorizontal,
  Trash2,
  Save,
  UploadCloud,
  File,
  X,
  Type,
  PlayCircle,
  Plus,
  Link, 
  Eye,
  ExternalLink
} from 'lucide-react';
import { db } from './firebase'; 
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [savedDecks, setSavedDecks] = useState([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "decks"), (snapshot) => {
      const decksData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
      setSavedDecks(decksData);
    });

    return () => unsubscribe();
  }, []);

  const [activeDeck, setActiveDeck] = useState(null);
  const [editingDeck, setEditingDeck] = useState(null); 
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [studyCards, setStudyCards] = useState([]);

  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);
  const [rawText, setRawText] = useState('');
  const [importMode, setImportMode] = useState('file');
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [importDestination, setImportDestination] = useState('new'); 

  const theme = {
    bg: '#FAF8FA',
    sidebar: '#ffffff',
    primary: '#914186',
    primaryLight: '#E0A7DA',
    accentPink: '#C27CB5',
    accentPurple: '#A3629F',
    accentTeal: '#E77ED0',
    textDark: '#1E1E1E',
    textGray: '#434144',
    textDeep: '#221D24'
  };

  const [kuromiEnergy, setKuromiEnergy] = useState(() => {
    const savedEnergy = localStorage.getItem('kuromiEnergy');
    const lastUpdate = localStorage.getItem('lastKuromiUpdate');
    const now = Date.now();

    let currentEnergy = savedEnergy ? parseFloat(savedEnergy) : 50;

    if (lastUpdate) {
      const timePassedMs = now - parseInt(lastUpdate);
      const hoursPassed = timePassedMs / (1000 * 60 * 60); 
      
      const energyLost = hoursPassed * 10; 
      currentEnergy = Math.max(0, currentEnergy - energyLost);
    }

    localStorage.setItem('kuromiEnergy', currentEnergy.toString());
    localStorage.setItem('lastKuromiUpdate', now.toString());

    return currentEnergy;
  });

  useEffect(() => {
    const decayTimer = setInterval(() => {
      setKuromiEnergy(prev => {
        const newEnergy = Math.max(0, prev - 1);
        localStorage.setItem('kuromiEnergy', newEnergy.toString());
        localStorage.setItem('lastKuromiUpdate', Date.now().toString());
        return newEnergy;
      });
    }, 360000); 

    return () => clearInterval(decayTimer);
  }, []);

  const getKuromiState = () => {
    if (kuromiEnergy < 33) return { mood: 'Triste', img: '/kuromi-triste.png', color: '#434144', message: 'Preciso de revisão...' };
    if (kuromiEnergy < 66) return { mood: 'Normal', img: '/kuromi-normal.png', color: theme.accentPurple, message: 'Pronta para estudar!' };
    return { mood: 'Feliz', img: '/kuromi-feliz.png', color: theme.accentTeal, message: 'Você está arrasando!' };
  };
  
  const currentKuromi = getKuromiState();

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/json') {
        alert("Por favor, envie apenas ficheiros .json");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleImportJson = async () => {
    try {
      let jsonData;

      if (importMode === 'file') {
        if (!selectedFile) {
          alert("Por favor, selecione um ficheiro JSON.");
          return;
        }
        
        const text = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = (e) => reject(new Error("Erro ao ler o ficheiro"));
          reader.readAsText(selectedFile);
        });
        
        jsonData = JSON.parse(text);
      } else {
        if (!rawText.trim()) {
          alert("Por favor, cole o código JSON.");
          return;
        }
        jsonData = JSON.parse(rawText);
      }

      const flashcardsArray = jsonData.flashcards || jsonData;
      
      if (!Array.isArray(flashcardsArray)) {
        throw new Error("O JSON precisa conter um array de flashcards.");
      }

      setParsedQuestions(flashcardsArray);
      
    } catch (error) {
      console.error("Erro ao processar JSON:", error);
      alert(`Erro ao ler o ficheiro JSON: ${error.message}. Verifique a formatação.`);
    }
  };

  const handleSaveDeck = async () => {
    const newCards = parsedQuestions.map((q, index) => ({
      ...q,
      id: Date.now() + index 
    }));

    try {
      if (importDestination === 'new') {
        const deckName = prompt("Dê um nome para este baralho:", "Novo Baralho");
        if (!deckName) return;

        const deckId = Date.now().toString();
        const newDeck = {
          title: deckName,
          createdAt: new Date().toLocaleDateString('pt-BR'),
          cards: newCards
        };

        await setDoc(doc(db, "decks", deckId), newDeck);
      } else {
        const deckRef = doc(db, "decks", importDestination);
        const existingDeck = savedDecks.find(d => d.id === importDestination);
        
        await setDoc(deckRef, {
          ...existingDeck,
          cards: [...existingDeck.cards, ...newCards]
        });
      }

      alert("Dados sincronizados na nuvem!");
      setParsedQuestions([]);
      setSelectedFile(null);
      setRawText('');
      setImportDestination('new'); 
      setCurrentView('dashboard');
    } catch (error) {
      console.error("Erro ao salvar no Firebase:", error);
      alert("Erro ao sincronizar. Verifique sua conexão.");
    }
  };

  const handleRemoveParsedQuestion = (idToRemove) => {
    setParsedQuestions(parsedQuestions.filter(q => q.id !== idToRemove));
  };

  const handleRenameDeck = (e, deck) => {
    e.stopPropagation(); 
    const newName = prompt("Digite o novo nome para este baralho:", deck.title);
    
    if (newName !== null && newName.trim() !== "") {
      const updatedDecks = savedDecks.map(d => 
        d.id === deck.id ? { ...d, title: newName.trim() } : d
      );
      setSavedDecks(updatedDecks);
      localStorage.setItem('meusFlashcards', JSON.stringify(updatedDecks));
    }
  };

  const handleDeleteDeck = async (e, idToRemove) => {
    e.stopPropagation();
    if(window.confirm("Tem certeza que deseja excluir este baralho definitivamente?")) {
      try {
        await deleteDoc(doc(db, "decks", idToRemove.toString()));
        const updatedDecks = savedDecks.filter(deck => deck.id !== idToRemove);
        setSavedDecks(updatedDecks);
        localStorage.setItem('meusFlashcards', JSON.stringify(updatedDecks));
      } catch (error) {
        console.error("Erro ao excluir o baralho:", error);
        alert("Erro ao excluir o baralho na nuvem.");
      }
    }
  };

  const startEdit = (e, deck) => {
    e.stopPropagation();
    setEditingDeck(JSON.parse(JSON.stringify(deck)));
    setCurrentView('edit');
  };

  const handleEditCardChange = (cardId, field, value) => {
    setEditingDeck(prev => ({
      ...prev,
      cards: prev.cards.map(c => c.id === cardId ? { ...c, [field]: value } : c)
    }));
  };

  const handleAddCardToEdit = () => {
    const newCard = { id: Date.now(), subject: 'Geral', question: '', answer: '' };
    setEditingDeck(prev => ({ ...prev, cards: [newCard, ...prev.cards] })); 
  };

  const handleRemoveCardFromEdit = async (cardId) => {
    const updatedCards = editingDeck.cards.filter(c => c.id !== cardId);
    setEditingDeck(prev => ({ ...prev, cards: updatedCards }));

    try {
      const deckRef = doc(db, "decks", editingDeck.id.toString());
      await setDoc(deckRef, {
        ...editingDeck,
        cards: updatedCards
      });
    } catch (error) {
      console.error("Erro ao excluir a carta no Firebase:", error);
      alert("Erro ao excluir a carta na nuvem. Verifique sua conexão.");
    }
  };

  const saveEditedDeck = async () => {
    if (!editingDeck.title.trim()) {
      alert("O baralho precisa de um título.");
      return;
    }
    
    try {
      const deckRef = doc(db, "decks", editingDeck.id.toString());
      await setDoc(deckRef, editingDeck);
      
      alert("Alterações salvas em tempo real!");
      setCurrentView('dashboard');
      setEditingDeck(null);
    } catch (error) {
      console.error("Erro ao atualizar:", error);
    }
  };

  const startReview = (deck) => {
    if (!deck.cards || deck.cards.length === 0) {
      alert("Este baralho está vazio! Adicione cartões editando o baralho.");
      return;
    }

    const now = Date.now();
    const cardsToReview = deck.cards.filter(card => !card.nextReview || card.nextReview <= now);

    if (cardsToReview.length === 0) {
      alert("Você já revisou todas as cartas necessárias por agora! Volte mais tarde. 🚀");
      return;
    }

    setActiveDeck(deck); 
    setStudyCards(cardsToReview); 
    setCurrentCardIndex(0);
    setIsAnswerRevealed(false);
    setCurrentView('study');
  };

  const handleAnswerCard = async (difficulty) => {
    const now = Date.now();
    let intervalMs = 0;

    if (difficulty === 'hard') intervalMs = 1 * 60 * 1000; 
    else if (difficulty === 'medium') intervalMs = 24 * 60 * 60 * 1000; 
    else if (difficulty === 'easy') intervalMs = 4 * 24 * 60 * 60 * 1000; 

    const currentStudyCard = studyCards[currentCardIndex];
    const fullDeck = savedDecks.find(d => d.id === activeDeck.id) || activeDeck;

    const updatedCards = fullDeck.cards.map(c => 
      c.id === currentStudyCard.id ? { ...c, nextReview: now + intervalMs } : c
    );

    const updatedDeck = { ...fullDeck, cards: updatedCards };

    try {
      await setDoc(doc(db, "decks", fullDeck.id.toString()), updatedDeck);
    } catch (error) {
      console.error("Erro ao salvar progresso:", error);
    }

    if (currentCardIndex < studyCards.length - 1) {
      setIsAnswerRevealed(false);
      setCurrentCardIndex(prev => prev + 1);
    } else {
      alert("Revisão concluída! Bom trabalho.");
      
      setKuromiEnergy(prev => {
        const newEnergy = Math.min(100, prev + 30);
        localStorage.setItem('kuromiEnergy', newEnergy.toString());
        localStorage.setItem('lastKuromiUpdate', Date.now().toString());
        return newEnergy;
      });

      setCurrentView('dashboard');
      setActiveDeck(null);
      setStudyCards([]);
      setCurrentCardIndex(0);
      setIsAnswerRevealed(false);
    }
  };

  const getCardColors = (index) => {
    const colors = [theme.accentTeal, theme.accentPurple, theme.accentPink, theme.primary];
    return colors[index % colors.length];
  };

  const getEmbedUrl = (url) => {
    if (!url) return '';
    if (url.includes('drive.google.com/file/d/')) {
      return url.replace(/\/view.*$/, '/preview');
    }
    return url;
  };

  const PdfViewerModal = () => {
    if (!activeDeck || !activeDeck.pdfUrl) return null;
    
    const embedUrl = getEmbedUrl(activeDeck.pdfUrl);

    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 lg:p-8" onClick={() => setIsPdfModalOpen(false)}>
        <div className="bg-white rounded-[2rem] w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
          <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-[#FAF8FA]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-xl text-[#914186] shadow-sm"><FileText size={20} /></div>
              <h3 className="font-bold text-lg" style={{ color: theme.textDeep }}>
                {activeDeck?.pdfName || 'Material de Apoio'}
              </h3>
            </div>
            
            <div className="flex items-center gap-3">
              <a 
                href={activeDeck.pdfUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hidden sm:flex px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm text-sm font-bold text-[#434144] hover:text-[#914186] hover:bg-slate-50 transition-colors items-center gap-2"
              >
                <ExternalLink size={16} /> Abrir Externo
              </a>
              <button onClick={() => setIsPdfModalOpen(false)} className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-red-50 hover:text-red-500 transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>
          <div className="flex-1 bg-slate-200 relative">
            <iframe 
              src={embedUrl} 
              className="absolute inset-0 w-full h-full border-0"
              title="Visualizador de Material"
              allow="autoplay"
            />
          </div>
        </div>
      </div>
    );
  };

  const Sidebar = () => (
    <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-xl lg:shadow-none lg:border-r border-slate-100 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col`}>
      <div className="p-8 flex items-center gap-3">
        <div className="p-2 rounded-xl text-white" style={{ backgroundColor: theme.primary }}>
          <Brain size={24} />
        </div>
        <span className="text-xl font-bold" style={{ color: theme.textDeep }}>FlashCard</span>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        <button onClick={() => { setCurrentView('dashboard'); setIsMobileMenuOpen(false); }} 
          className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-medium transition-all ${currentView === 'dashboard' ? 'text-[#914186] bg-[#914186]/10' : 'text-[#434144] hover:bg-slate-50'}`}>
          <LayoutDashboard size={20} /> Dashboard
        </button>
        <button onClick={() => { setCurrentView('import'); setIsMobileMenuOpen(false); }} 
          className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-medium transition-all ${currentView === 'import' ? 'text-[#914186] bg-[#914186]/10' : 'text-[#434144] hover:bg-slate-50'}`}>
          <FileText size={20} /> Importar Baralho
        </button>
        <button onClick={() => { 
            if(activeDeck) setCurrentView('study'); 
            else { alert("Selecione um baralho no Dashboard primeiro!"); setCurrentView('dashboard'); }
            setIsMobileMenuOpen(false); 
          }} 
          className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-medium transition-all ${currentView === 'study' ? 'text-[#914186] bg-[#914186]/10' : 'text-[#434144] hover:bg-slate-50'}`}>
          <BookOpen size={20} /> Revisar
        </button>
      </nav>
    </aside>
  );
  
  const getPendingCardsCount = (deck) => {
    if (!deck.cards) return 0;
    const now = Date.now();
    return deck.cards.filter(card => !card.nextReview || card.nextReview <= now).length;
  };

  const renderDashboard = () => (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-in fade-in duration-500">
      <div className="xl:col-span-2 space-y-8">
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold" style={{ color: theme.textDeep }}>Meus Baralhos</h2>
            <button onClick={() => setCurrentView('import')} className="text-sm font-medium hover:underline" style={{ color: theme.primary }}>+ Criar Novo</button>
          </div>
          
          {savedDecks.length === 0 ? (
            <div className="bg-white rounded-[2rem] p-12 text-center shadow-sm border border-slate-50 flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-[#434144]">
                <BookOpen size={24} />
              </div>
              <h3 className="text-lg font-bold mb-2" style={{ color: theme.textDark }}>Nenhum baralho encontrado</h3>
              <p className="text-[#434144] mb-6">Importe um ficheiro JSON para começar a estudar.</p>
              <button onClick={() => setCurrentView('import')} className="px-6 py-3 rounded-xl font-bold text-white shadow-md transition-all hover:-translate-y-1" style={{ backgroundColor: theme.primary }}>
                Importar Baralho
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {savedDecks.map((deck, idx) => (
                <div 
                  key={deck.id} 
                  onClick={() => startReview(deck)}
                  className="p-6 rounded-[2rem] text-white relative overflow-hidden shadow-sm hover:-translate-y-1 transition-transform cursor-pointer group flex flex-col h-full" 
                  style={{ backgroundColor: getCardColors(idx) }}
                >
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
                  
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <button onClick={(e) => handleRenameDeck(e, deck)} className="p-2 bg-black/10 rounded-xl hover:bg-white hover:text-[#1E1E1E] transition-colors" title="Renomear Baralho">
                      <Type size={16} />
                    </button>
                    <button onClick={(e) => startEdit(e, deck)} className="p-2 bg-black/10 rounded-xl hover:bg-white hover:text-[#1E1E1E] transition-colors" title="Editar Cartões">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={(e) => handleDeleteDeck(e, deck.id)} className="p-2 bg-black/10 rounded-xl hover:bg-red-500 hover:text-white transition-colors" title="Excluir">
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="w-16 h-16 bg-white/20 rounded-2xl mb-6 flex items-center justify-center backdrop-blur-sm border border-white/20">
                    <PlayCircle size={32} className="text-white" />
                  </div>
                  
                  <h3 className="font-bold text-lg leading-tight mb-1 relative z-10 break-words">{deck.title}</h3>
  
                  <div className="flex flex-col mb-6 relative z-10 flex-grow">
                    <p className="text-white/80 text-sm">{deck.cards.length} cartões no total</p>
                    
                    {getPendingCardsCount(deck) > 0 ? (
                      <span className="inline-flex items-center gap-1 mt-2 text-xs font-bold bg-white text-[#1E1E1E] px-3 py-1.5 rounded-full w-max shadow-sm animate-pulse">
                        <Bell size={12} className="text-red-500" />
                        {getPendingCardsCount(deck)} a revisar
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 mt-2 text-xs font-bold bg-white/20 text-white px-3 py-1.5 rounded-full w-max backdrop-blur-md">
                        Tudo em dia! 🎉
                      </span>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center relative z-10 mt-auto pt-4 border-t border-white/10">
                    <span className="text-xs font-medium bg-white/20 px-3 py-1 rounded-full backdrop-blur-md">
                      Criado: {deck.createdAt}
                    </span>
                    {deck.pdfUrl && (
                      <span className="bg-white/20 p-1.5 rounded-lg" title="Possui PDF anexado">
                        <Link size={14} className="text-white" />
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="xl:col-span-1 space-y-8">
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-50 flex flex-col items-center relative overflow-hidden">
          <div 
            className="absolute top-0 left-0 w-full h-24 opacity-20 transition-colors duration-500" 
            style={{ backgroundColor: currentKuromi.color }}
          ></div>
          
          <h3 className="font-bold text-lg mb-6 relative z-10" style={{ color: theme.textDeep }}>
            Kuromi piranha
          </h3>
          
          <div className="w-32 h-32 rounded-3xl bg-[#FAF8FA] flex items-center justify-center mb-4 relative z-10 shadow-inner border border-slate-100 overflow-hidden transition-all duration-300 transform hover:scale-105">
            <img 
              src={currentKuromi.img} 
              alt={`Kuromi ${currentKuromi.mood}`} 
              className="w-full h-full object-contain p-2" 
              onError={(e) => {
                e.target.onerror = null; 
                e.target.src = `https://ui-avatars.com/api/?name=Kuromi&background=random&color=fff&size=128`;
              }}
            />
          </div>

          <p className="font-bold text-lg transition-colors duration-300" style={{ color: currentKuromi.color }}>
            {currentKuromi.mood}
          </p>
          <p className="text-sm text-[#434144] text-center mt-1 mb-4 h-8">
            {currentKuromi.message}
          </p>

          <div className="w-full bg-slate-100 rounded-full h-3 mb-1 overflow-hidden">
            <div 
              className="h-3 rounded-full transition-all duration-500 ease-out" 
              style={{ 
                width: `${Math.round(kuromiEnergy)}%`, 
                backgroundColor: currentKuromi.color 
              }}
            ></div>
          </div>
          <div className="w-full flex justify-between text-[10px] font-bold text-[#434144] uppercase tracking-wider">
            <span>Energia</span>
            <span>{Math.round(kuromiEnergy)}/100</span>
          </div>
        </div>

        <div className="flex flex-col items-center bg-white p-8 rounded-[2rem] shadow-sm border border-slate-50">
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full p-1" style={{ backgroundColor: theme.primaryLight }}>
              <div className="w-full h-full rounded-full bg-slate-200"></div>
            </div>
            <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center" style={{ backgroundColor: theme.primary }}>
              <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
            </div>
          </div>
          <h3 className="font-bold text-xl" style={{ color: theme.textDeep }}>Estudante Pro</h3>
          <p className="text-sm text-[#434144]">Nível Intermediário</p>
          
          <div className="w-full border-t border-slate-100 mt-6 pt-6 flex justify-around text-center">
            <div>
              <p className="text-2xl font-bold" style={{ color: theme.textDeep }}>{savedDecks.length}</p>
              <p className="text-xs text-[#434144] uppercase font-bold tracking-wider">Baralhos</p>
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: theme.textDeep }}>
                {savedDecks.reduce((acc, deck) => acc + deck.cards.length, 0)}
              </p>
              <p className="text-xs text-[#434144] uppercase font-bold tracking-wider">Cartões</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderEditView = () => {
    if (!editingDeck) return null;

    return (
      <div className="max-w-4xl mx-auto animate-in fade-in duration-500 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => { setCurrentView('dashboard'); setEditingDeck(null); }} className="p-2 bg-white rounded-xl shadow-sm text-[#434144] hover:text-[#1E1E1E] transition-colors">
              <ArrowLeft size={20} />
            </button>
            <input 
              type="text" 
              value={editingDeck.title}
              onChange={(e) => setEditingDeck({...editingDeck, title: e.target.value})}
              className="text-2xl font-bold bg-transparent outline-none border-b-2 border-transparent focus:border-[#914186] transition-colors px-2"
              style={{ color: theme.textDeep }}
              placeholder="Nome do Baralho"
              title="Clique para renomear"
            />
          </div>
          <button onClick={saveEditedDeck} className="px-6 py-3 rounded-xl font-bold text-white shadow-md transition-all hover:-translate-y-1 flex items-center gap-2" style={{ backgroundColor: theme.primary }}>
            <Save size={18} /> Salvar Alterações
          </button>
        </div>

        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8 mb-8">
          <h3 className="text-lg font-bold mb-4" style={{ color: theme.textDark }}>Material de Apoio (Link do PDF)</h3>
          <p className="text-sm text-[#434144] mb-4">Adicione o link do seu PDF (Google Drive, Dropbox, etc.). Assim você não gasta o armazenamento do seu plano!</p>
          <div className="flex items-center gap-4">
              <div className="flex-1 space-y-3">
                <input 
                  type="text" 
                  value={editingDeck.pdfName || ''}
                  onChange={(e) => setEditingDeck(prev => ({...prev, pdfName: e.target.value}))}
                  placeholder="Nome do material (Ex: Resolução 2025)"
                  className="w-full text-sm px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-[#914186] bg-[#FAF8FA]"
                />
                <div className="flex gap-2">
                  <input 
                    type="url" 
                    value={editingDeck.pdfUrl || ''}
                    onChange={(e) => setEditingDeck(prev => ({...prev, pdfUrl: e.target.value}))}
                    placeholder="Cole o link de compartilhamento aqui (https://...)"
                    className="w-full text-sm px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-[#914186] bg-[#FAF8FA]"
                  />
                  {editingDeck.pdfUrl && (
                    <button 
                      onClick={() => setEditingDeck(prev => ({...prev, pdfUrl: null, pdfName: null}))} 
                      className="px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm text-[#434144] hover:text-red-500 hover:bg-red-50 transition-colors" 
                      title="Remover Link"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              </div>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold" style={{ color: theme.textDark }}>Cartões ({editingDeck.cards.length})</h3>
            <button onClick={handleAddCardToEdit} className="flex items-center gap-2 text-sm font-bold hover:underline" style={{ color: theme.primary }}>
              <Plus size={16} /> Adicionar Novo Cartão
            </button>
          </div>

          <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {editingDeck.cards.length === 0 ? (
              <p className="text-center text-[#434144] py-8">Nenhum cartão neste baralho.</p>
            ) : (
              editingDeck.cards.map((card, index) => (
                <div key={card.id} className="bg-[#FAF8FA] rounded-2xl p-6 border border-slate-100 relative group">
                  <div className="absolute top-6 right-6 flex gap-2">
                    <button onClick={() => handleRemoveCardFromEdit(card.id)} className="p-2 bg-white rounded-lg shadow-sm text-[#434144] hover:text-red-500 transition-colors" title="Excluir Cartão">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div className="mb-4 w-1/3">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#434144] mb-1 block">Matéria / Assunto</label>
                    <input 
                      type="text" value={card.subject || ''} onChange={(e) => handleEditCardChange(card.id, 'subject', e.target.value)}
                      className="w-full text-sm px-3 py-1.5 rounded-lg border border-slate-200 outline-none focus:border-[#914186]"
                      placeholder="Ex: Geral"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs font-bold text-[#434144] uppercase tracking-wider mb-2 block">Frente (Pergunta)</label>
                      <textarea 
                        value={card.question} onChange={(e) => handleEditCardChange(card.id, 'question', e.target.value)}
                        className="w-full h-24 p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#914186]/20 resize-none font-medium"
                        placeholder="Digite a pergunta aqui..."
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-[#434144] uppercase tracking-wider mb-2 block">Verso (Resposta)</label>
                      <textarea 
                        value={card.answer} onChange={(e) => handleEditCardChange(card.id, 'answer', e.target.value)}
                        className="w-full h-24 p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#914186]/20 resize-none"
                        placeholder="Digite a resposta aqui..."
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderImportView = () => (
    <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-4 duration-500 py-8">
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8 md:p-12">
        {parsedQuestions.length === 0 && (
          <div className="animate-in fade-in">
            <div className="mb-8 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: theme.primaryLight }}>
                {importMode === 'file' ? <UploadCloud size={32} style={{ color: theme.primary }} /> : <Type size={32} style={{ color: theme.primary }} />}
              </div>
              <h2 className="text-3xl font-bold mb-3" style={{ color: theme.textDeep }}>Importar Cartões</h2>
              <p className="text-[#434144] max-w-lg mx-auto">Envie o ficheiro .json ou cole o código JSON contendo os flashcards.</p>
            </div>

            <div className="flex justify-center mb-8">
              <div className="bg-[#FAF8FA] p-1.5 rounded-2xl inline-flex border border-slate-100">
                <button onClick={() => setImportMode('file')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm transition-all ${importMode === 'file' ? 'bg-white text-[#1E1E1E] shadow-sm' : 'text-[#434144] hover:text-[#1E1E1E]'}`}>
                  <UploadCloud size={16} /> Enviar Ficheiro
                </button>
                <button onClick={() => setImportMode('text')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm transition-all ${importMode === 'text' ? 'bg-white text-[#1E1E1E] shadow-sm' : 'text-[#434144] hover:text-[#1E1E1E]'}`}>
                  <Type size={16} /> Colar Texto
                </button>
              </div>
            </div>

            <div className="mb-8">
              {importMode === 'file' ? (
                !selectedFile ? (
                  <div className="relative border-2 border-dashed border-slate-300 rounded-3xl p-12 text-center hover:bg-slate-50 transition-colors cursor-pointer group">
                    <input type="file" accept=".json" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <UploadCloud className="w-12 h-12 text-slate-400 mx-auto mb-4 group-hover:text-[#914186] transition-colors" />
                    <p className="text-lg font-medium" style={{ color: theme.textDark }}>Clique para enviar ou arraste o ficheiro aqui</p>
                  </div>
                ) : (
                  <div className="border-2 border-slate-200 rounded-3xl p-8 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-purple-500"><File size={24} /></div>
                      <div>
                        <p className="font-bold text-lg" style={{ color: theme.textDark }}>{selectedFile.name}</p>
                      </div>
                    </div>
                    <button onClick={() => setSelectedFile(null)} className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"><X size={20} /></button>
                  </div>
                )
              ) : (
                <textarea 
                  value={rawText} onChange={(e) => setRawText(e.target.value)}
                  className="w-full h-64 p-6 bg-[#FAF8FA] border border-slate-200 rounded-3xl outline-none resize-none font-mono text-sm leading-relaxed transition-all focus:ring-4 focus:ring-[#914186]/10"
                  placeholder='Cole o JSON aqui...'
                ></textarea>
              )}
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button onClick={() => setCurrentView('dashboard')} className="px-8 py-4 rounded-2xl font-bold text-[#434144] bg-white border-2 border-slate-100 hover:bg-slate-50 transition-colors">Cancelar</button>
              <button onClick={handleImportJson} disabled={importMode === 'file' ? !selectedFile : !rawText.trim()} className="px-8 py-4 rounded-2xl font-bold text-white shadow-lg hover:-translate-y-1 transition-all flex items-center gap-2 disabled:opacity-50" style={{ backgroundColor: theme.primary }}>
                <Save className="w-5 h-5" /> Extrair Cartões
              </button>
            </div>
          </div>
        )}

        {parsedQuestions.length > 0 && (
          <div className="animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-6">
              <div>
                <h2 className="text-2xl font-bold mb-1" style={{ color: theme.textDeep }}>Pré-visualização</h2>
                <p className="text-[#434144] text-sm"><span className="font-bold" style={{ color: theme.primary }}>{parsedQuestions.length} questões</span> importadas.</p>
              </div>
              <button onClick={() => { setParsedQuestions([]); setSelectedFile(null); }} className="text-sm font-medium text-[#434144] hover:text-[#1E1E1E] transition-colors">Descartar tudo</button>
            </div>

            <div className="space-y-6 mb-8 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {parsedQuestions.map((card, index) => (
                <div key={card.id || index} className="bg-[#FAF8FA] rounded-2xl p-6 border border-slate-100 relative group">
                  <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleRemoveParsedQuestion(card.id)} className="p-2 bg-white rounded-lg shadow-sm text-[#434144] hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div>
                      <span className="text-xs font-bold text-[#434144] uppercase tracking-wider mb-2 block">Pergunta</span>
                      <p className="text-sm font-medium" style={{ color: theme.textDark }}>{card.question}</p>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#434144] uppercase tracking-wider mb-2 block">Resposta</span>
                      <p className="text-sm" style={{ color: theme.textGray }}>{card.answer}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <label className="text-sm font-bold text-[#434144]">Salvar em:</label>
                <select
                  value={importDestination}
                  onChange={(e) => setImportDestination(e.target.value)}
                  className="bg-[#FAF8FA] border border-slate-200 text-[#1E1E1E] text-sm rounded-xl focus:ring-[#914186] focus:border-[#914186] block p-2.5 outline-none font-medium cursor-pointer"
                >
                  <option value="new">+ Criar Novo Baralho</option>
                  {savedDecks.map(deck => (
                    <option key={deck.id} value={deck.id.toString()}>{deck.title}</option>
                  ))}
                </select>
              </div>
              <button onClick={handleSaveDeck} disabled={parsedQuestions.length === 0} className="px-8 py-4 rounded-2xl font-bold text-white shadow-lg hover:-translate-y-1 transition-all flex items-center gap-2 w-full sm:w-auto justify-center" style={{ backgroundColor: theme.primary }}>
                <Save className="w-5 h-5" /> Salvar Cartões
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );

  const renderStudyView = () => {
    if (!activeDeck || !activeDeck.cards) return null;
    const card = studyCards[currentCardIndex];

    return (
      <div className="max-w-3xl mx-auto py-8 lg:py-16 animate-in zoom-in-95 duration-500">
        <div className="flex flex-wrap justify-between items-center mb-8 px-4 gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => { setCurrentView('dashboard'); setActiveDeck(null); setIsAnswerRevealed(false); }} className="flex items-center gap-2 text-[#434144] hover:text-[#1E1E1E] font-medium transition-colors bg-white px-4 py-2 rounded-xl shadow-sm">
              <ArrowLeft className="w-4 h-4" /> Sair
            </button>
            <div className="font-medium text-[#434144] px-4 py-2 bg-white rounded-full shadow-sm text-sm">
              Estudando: <span style={{ color: theme.textDeep }} className="font-bold">{activeDeck.title}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 ml-auto">
            {activeDeck.pdfUrl && (
              <button 
                onClick={() => setIsPdfModalOpen(true)}
                className="flex items-center gap-2 font-bold px-4 py-2 rounded-xl shadow-sm hover:opacity-90 transition-opacity" 
                style={{ backgroundColor: theme.primaryLight, color: theme.primary }}
              >
                <Eye size={16} /> Ver Material
              </button>
            )}
            <span className="font-bold bg-white px-4 py-2 rounded-full shadow-sm text-sm" style={{ color: theme.primary }}>
              {currentCardIndex + 1} / {studyCards.length}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-purple-900/5 border border-slate-50 min-h-[450px] flex flex-col relative overflow-hidden transition-all group">
          <div className="absolute top-8 left-8 right-8 flex justify-between items-center">
             <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider" style={{ backgroundColor: theme.primaryLight, color: theme.primary }}>
               {card.subject || "Geral"}
             </span>
          </div>
          <div className="flex-1 p-8 sm:p-16 flex flex-col justify-center items-center text-center mt-12">
            <h3 className="text-2xl sm:text-3xl font-bold leading-relaxed" style={{ color: theme.textDeep }}>{card.question}</h3>
          </div>
          {isAnswerRevealed && (
            <div className="border-t-2 border-dashed border-slate-100 bg-[#FAF8FA] p-8 sm:p-12 animate-in slide-in-from-top-4 duration-500">
              <span className="block text-xs font-bold text-[#434144] uppercase tracking-widest mb-6 text-center">Resposta</span>
              <p className="text-lg whitespace-pre-line text-center font-medium" style={{ color: theme.textDark }}>{card.answer}</p>
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-center">
          {!isAnswerRevealed ? (
            <button onClick={() => setIsAnswerRevealed(true)} className="px-12 py-5 rounded-2xl font-bold text-white shadow-lg hover:-translate-y-1 transition-all text-lg w-full sm:w-auto" style={{ backgroundColor: theme.primary }}>
              Revelar Resposta
            </button>
          ) : (
            <div className="w-full flex flex-col sm:flex-row gap-4 animate-in fade-in duration-300">
              <button onClick={() => handleAnswerCard('hard')} className="flex-1 py-4 rounded-2xl font-bold text-red-500 bg-red-50 hover:bg-red-100 transition-colors flex flex-col items-center gap-1 border border-red-100">
                <span className="text-lg">Difícil</span>
              </button>
              <button onClick={() => handleAnswerCard('medium')} className="flex-1 py-4 rounded-2xl font-bold text-[#914186] bg-[#914186]/10 hover:bg-[#914186]/20 transition-colors flex flex-col items-center gap-1 border border-[#914186]/20">
                <span className="text-lg">Bom</span>
              </button>
              <button onClick={() => handleAnswerCard('easy')} className="flex-1 py-4 rounded-2xl font-bold text-emerald-500 bg-emerald-50 hover:bg-emerald-100 transition-colors flex flex-col items-center gap-1 border border-emerald-100">
                <span className="text-lg">Fácil</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen font-sans flex" style={{ backgroundColor: theme.bg, color: theme.textDark }}>
      <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden fixed top-6 left-6 z-50 bg-white p-3 rounded-xl shadow-md" style={{ color: theme.textDeep }}>
        <LayoutDashboard size={24} />
      </button>

      {isMobileMenuOpen && <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-30 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />}

      <Sidebar />

      <div className="flex-1 lg:ml-64 flex flex-col h-screen overflow-hidden relative">
        <header className="h-24 px-8 flex items-center justify-between flex-shrink-0">
          <div className="hidden lg:block">
            <h1 className="text-3xl font-bold capitalize" style={{ color: theme.textDeep }}>
              {currentView === 'dashboard' ? 'Dashboard' : currentView === 'import' ? 'Nova Prova' : currentView === 'edit' ? 'Editar Baralho' : 'Revisão'}
            </h1>
          </div>
          
          <div className="flex-1 lg:flex-none flex items-center justify-end lg:justify-start gap-6 ml-auto lg:ml-0">
            <div className="hidden md:flex relative w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#434144]" size={18} />
              <input type="text" placeholder="Pesquisar..." className="w-full bg-white border border-slate-100 rounded-2xl py-3 pl-12 pr-4 text-sm outline-none shadow-sm placeholder-[#434144]" style={{ color: theme.textDark }} />
            </div>
            <button className="relative p-3 bg-white rounded-xl shadow-sm border border-slate-50 hover:bg-slate-50 transition-colors" style={{ color: theme.textDeep }}>
              <Bell size={20} />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <button className="lg:hidden w-11 h-11 rounded-xl overflow-hidden border border-slate-100 bg-slate-200"></button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 pt-0 relative">
          <div className="max-w-7xl mx-auto">
            {currentView === 'dashboard' && renderDashboard()}
            {currentView === 'import' && renderImportView()}
            {currentView === 'study' && renderStudyView()}
            {currentView === 'edit' && renderEditView()}
          </div>
        </main>

        {isPdfModalOpen && <PdfViewerModal />}
      </div>
    </div>
  );
}