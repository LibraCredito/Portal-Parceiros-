import React, { useState, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePloomesOptions, clearExpiredCache, clearAllPloomesCache, getCacheInfo } from '@/hooks/usePloomesOptions';
import { useIBGECities } from '@/hooks/useIBGECities';
import { useDynamicLTV } from '@/hooks/useDynamicLTV';
import { TOMADORES_OPTIONS_IDS, QUANTIDADE_GARANTIDORES_OPTIONS_ID, GARANTIDORES_OPTIONS_IDS, GRAU_PARENTESCO_OPTIONS_ID, OPTIONS_GARANTIDORES_IDS } from '@/hooks/ploomesOptionsIds';
import { SelectInput } from '@/components/FormMVP/SelectInput';
import { InputText } from '@/components/FormInputs/InputText';
import { formatadorInput } from '@/components/FormInputs/formatadorInput';
import { QUANTIDADE_TOMADORES_OPTIONS_ID } from '@/hooks/ploomesOptionsIds';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { indexedDBManager, saveDocumentToIndexedDB, loadDocumentFromIndexedDB, DocumentMetadata } from '@/lib/indexedDB';
import { googleDriveDirect } from '@/services/googleDriveDirect';
import { useAuth } from '@/contexts/AuthContext';
import CityPopulationDisplay from '@/components/CityPopulationDisplay';

// Funções de validação
const validarCPF = (cpf: string): boolean => {
  const cpfLimpo = cpf.replace(/[^\d]/g, '');
  
  if (cpfLimpo.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpfLimpo)) return false;
  
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpfLimpo.charAt(i)) * (10 - i);
  }
  let resto = soma % 11;
  const digito1 = resto < 2 ? 0 : 11 - resto;
  
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpfLimpo.charAt(i)) * (11 - i);
  }
  resto = soma % 11;
  const digito2 = resto < 2 ? 0 : 11 - resto;
  
  return cpfLimpo.charAt(9) === digito1.toString() && cpfLimpo.charAt(10) === digito2.toString();
};

const validarCNPJ = (cnpj: string): boolean => {
  const cnpjLimpo = cnpj.replace(/[^\d]/g, '');
  
  if (cnpjLimpo.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpjLimpo)) return false;
  
  let soma = 0;
  let peso = 2;
  for (let i = 11; i >= 0; i--) {
    soma += parseInt(cnpjLimpo.charAt(i)) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  let resto = soma % 11;
  const digito1 = resto < 2 ? 0 : 11 - resto;
  
  soma = 0;
  peso = 2;
  for (let i = 12; i >= 0; i--) {
    soma += parseInt(cnpjLimpo.charAt(i)) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  resto = soma % 11;
  const digito2 = resto < 2 ? 0 : 11 - resto;
  
  return cnpjLimpo.charAt(12) === digito1.toString() && cnpjLimpo.charAt(13) === digito2.toString();
};

const validarEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

const validarTelefone = (telefone: string): boolean => {
  const telefoneLimpo = telefone.replace(/[^\d]/g, '');
  return telefoneLimpo.length >= 10 && telefoneLimpo.length <= 11;
};

const validarDataNascimento = (dataNascimento: string): boolean => {
  if (!dataNascimento) return false;
  
  const data = new Date(dataNascimento);
  const hoje = new Date();
  const idade = hoje.getFullYear() - data.getFullYear();
  const mesAtual = hoje.getMonth();
  const mesNascimento = data.getMonth();
  
  // Ajustar idade se ainda não fez aniversário este ano
  let idadeAjustada = idade;
  if (mesAtual < mesNascimento || (mesAtual === mesNascimento && hoje.getDate() < data.getDate())) {
    idadeAjustada = idade - 1;
  }
  
  // Verificar se a idade está entre 18 e 80 anos
  return idadeAjustada >= 18 && idadeAjustada <= 80;
};

const validarCEP = (cep: string): boolean => {
  if (!cep) return false;
  // Remove caracteres não numéricos
  const cepNumeros = cep.replace(/\D/g, '');
  // Verifica se tem exatamente 8 dígitos
  return cepNumeros.length === 8;
};

const validarMinimoCaracteres = (valor: string, minimo: number = 3): boolean => {
  if (!valor) return false;
  return valor.trim().length >= minimo;
};

const validarCampoVazio = (valor: string): boolean => {
  return valor && valor.trim() !== '' && valor !== 'Selecione uma opção' && valor !== 'Digite o nome' && valor !== 'Digite o email' && valor !== 'Digite o telefone' && valor !== 'Digite o CEP' && valor !== 'Digite o endereço' && valor !== 'Digite a profissão' && valor !== 'Renda formal' && valor !== 'Renda informal' && valor !== 'Renda total';
};

const validarCampoObjeto = (valor: any): boolean => {
  return valor && valor.Id && valor.Id !== '' && valor.Name && valor.Name !== '';
};

const validarCampoMonetario = (valor: string): boolean => {
  return valor && valor.trim() !== '' && valor !== 'Selecione uma opção' && valor !== 'Digite o nome' && valor !== 'Digite o email' && valor !== 'Digite o telefone' && valor !== 'Digite o CEP' && valor !== 'Digite o endereço' && valor !== 'Digite a profissão' && valor !== 'Renda formal' && valor !== 'Renda informal' && valor !== 'Renda total';
};

const validarCampoMonetarioMaiorQueZero = (valor: string): boolean => {
  if (!validarCampoMonetario(valor)) return false;
  
  // Converter o valor monetário para número
  const numero = valor.replace(/[^\d,]/g, '').replace(',', '.');
  const valorNumerico = parseFloat(numero) || 0;
  
  return valorNumerico > 0;
};

const validarValorSolicitado = (valor: string): boolean => {
  if (!validarCampoMonetario(valor)) return false;
  
  // Converter o valor monetário para número
  const numero = valor.replace(/[^\d,]/g, '').replace(',', '.');
  const valorNumerico = parseFloat(numero) || 0;
  
  return valorNumerico >= 75000 && valorNumerico <= 5000000;
};

const validarPrazoSolicitado = (valor: string): boolean => {
  if (!valor) return false;
  const numero = parseInt(valor.replace(/\D/g, ''));
  return numero === 1 || (numero >= 36 && numero <= 240);
};

const validarJurosSolicitado = (valor: string): boolean => {
  if (!valor) return false;
  // Converter para número, removendo caracteres não numéricos e vírgulas
  const numero = parseFloat(valor);
  if (isNaN(numero)) return false;
  return numero >= 1.19 && numero <= 2.00;
};

const validarValorGarantia = (valor: string): boolean => {
  if (!valor) return false;
  // Converter para número, removendo caracteres não numéricos e vírgulas
  const numero = parseFloat(valor.replace(/[^\d,]/g, '').replace(',', '.'));
  if (isNaN(numero)) return false;
  return numero >= 250000 && numero <= 50000000;
};

const LOCAL_STORAGE_KEY = 'ploomes_selected_tomadores';
const EMAIL_PARCEIRO_STORAGE_KEY = 'ploomes_email_parceiro_responsavel';
const TOMADORES_STORAGE_KEY = 'ploomes_tomadores_dados';
const etapas = ['Tomadores', 'Empréstimo', 'Garantia'];

const initialTomador = {
  nome: '',
  cpf: '',
  cnpj: '',
  telefone: '',
  endereco: '',
  juros: '',
  money: '',
  cep: '',
  dataNascimento: '',
  email: '',
  estadoCivil: { Id: '', Name: '' },
  tipoPessoa: { Id: '', Name: '' },
  qualificacaoProfissional: { Id: '', Name: '' },
  profissao: '',
  rendaFormal: '',
  comprovacaoRendaFormal: { Id: '', Name: '' },
  rendaInformal: '',
  comprovacaoRendaInformal: { Id: '', Name: '' },
  rendaTotalInformada: '',
  quantidadeSociosPJ: { Id: '', Name: '' },
  numeroAdmin: { Id: '', Name: '' },
  ramoPJ: '',
  possuiPJVinculada: { Id: '', Name: '' },
  pjComporRenda: { Id: '', Name: '' },
  quantidadePJ: '',
  pjsVinculadas: [] as Array<{ nome: string; cnpj: string }>,
};

const EMPRESTIMO_STORAGE_KEY = 'ploomes_emprestimo_dados';
const initialEmprestimo = {
  amortizacao: { Id: '', Name: '' },
  carencia: { Id: '', Name: '' },
  motivoEmprestimo: { Id: '', Name: '' },
  valorSolicitado: '',
  rendaTotal: '',
  prazoSolicitado: '',
  jurosSolicitado: '',
  comentarios: '',
};

const GARANTIA_STORAGE_KEY = 'ploomes_garantia_dados';
const initialGarantia = {
  garantiaPertenceTomador: { Id: '', Name: '' },
  valorGarantia: '',
  cepGarantia: '',
  numeroGarantia: '',
  cidadeGarantia: { Id: '', Name: '' },
  ruralUrbano: { Id: '', Name: '' },
  enderecoGarantia: '',
  unidadeFederativa: { Id: '', Name: '' },
  unidadeFederativaSigla: '', // Campo adicional para a sigla do estado
  situacaoGarantia: undefined,
  comQuemEstaFinanciada: { Id: '', Name: '' },
  valorEmAberto: '',
  quantasParcelasFalta: '',
  escritura: undefined,
  nomeMatrícula: undefined,
  processoInventario: undefined,
  imovelAverbado: undefined,
  possuiUsufruto: undefined,
  dividaCondominio: undefined,
  dividaIPTU: undefined,
  dividaITR: { Id: '', Name: '' },
  utilizacaoGarantia: { Id: '', Name: '' },
  tipoGarantia: { Id: '', Name: '' },
};

// Definições iniciais
const GARANTIDORES_STORAGE_KEY = 'ploomes_garantidores_dados';
const QUANTIDADE_GARANTIDORES_STORAGE_KEY = 'ploomes_selected_garantidores';
const initialGarantidor = {
  estadoCivil: { Id: '', Name: '' },
  nome: '',
  cpf: '',
  cnpj: '',
  profissao: '',
  email: '',
  grauParentesco: { Id: '', Name: '' },
  temEmpresa: { Id: '', Name: '' },
  tipoPessoa: { Id: '', Name: '' },
};

// Tipos para documento de identificação
interface DocumentoIdentificacao {
  file: File | null;
  originalName: string;
  uploaded: boolean;
  filePath?: string;
  id?: string; // ID do IndexedDB
  indexedDBId?: string; // ID específico do IndexedDB
}

interface DocumentoComprovanteEndereco {
  file: File | null;
  originalName: string;
  uploaded: boolean;
  filePath?: string;
  id?: string; // ID do IndexedDB
  indexedDBId?: string; // ID específico do IndexedDB
}

interface DocumentoCertificadoCivil {
  file: File | null;
  originalName: string;
  uploaded: boolean;
  filePath?: string;
  id?: string; // ID do IndexedDB
  indexedDBId?: string; // ID específico do IndexedDB
}

interface DocumentoHoleriteExtrato {
  file: File | null;
  originalName: string;
  uploaded: boolean;
  filePath?: string;
  id?: string; // ID do IndexedDB
  indexedDBId?: string; // ID específico do IndexedDB
  tipo: 'holerite' | 'extrato'; // Para identificar o tipo do documento
  campoId: string; // Para identificar o campo específico (ex: 'holerite_1', 'extrato_2')
}


const Formulario: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  // Inicializar IndexedDB ao montar o componente
  useEffect(() => {
    const initIndexedDB = async () => {
      try {
        await indexedDBManager.init();
      } catch (error) {
        console.error('Erro ao inicializar IndexedDB:', error);
      }
    };
    
    initIndexedDB();
  }, []);

  // Limpar cache expirado ao montar o componente
  useEffect(() => {
    clearExpiredCache();
    
    // Mostrar informações do cache
    const cacheInfo = getCacheInfo();
  }, []);

  // Debug: mostrar dados do localStorage ao montar o componente
  useEffect(() => {
    const savedQtd = localStorage.getItem('ploomes_selected_tomadores');
    const savedEmailParceiro = localStorage.getItem(EMAIL_PARCEIRO_STORAGE_KEY);
    const savedTomadores = localStorage.getItem('ploomes_tomadores_dados');
    const savedEmprestimo = localStorage.getItem('ploomes_emprestimo_dados');
    const savedGarantia = localStorage.getItem('ploomes_garantia_dados');
    const savedGarantidores = localStorage.getItem('ploomes_garantidores_dados');
    
    if (savedQtd) {
      const { Id, Name } = JSON.parse(savedQtd);
    }
    if (savedEmailParceiro) {
      setEmailParceiroResponsavel(savedEmailParceiro);
    }
    if (savedTomadores) {
      const parsed = JSON.parse(savedTomadores);
    }
    if (savedEmprestimo) {
      const parsedEmprestimo = JSON.parse(savedEmprestimo);
    }
    if (savedGarantia) {
      const parsedGarantia = JSON.parse(savedGarantia);
    }
    if (savedGarantidores) {
      const parsedGarantidores = JSON.parse(savedGarantidores);
    }
  }, []);

  const [etapa, setEtapa] = useState(0);
  const [quantidade, setQuantidade] = useState<number | null>(null);
  const [quantidadeId, setQuantidadeId] = useState<number | null>(null);
  const [emailParceiroResponsavel, setEmailParceiroResponsavel] = useState<string>('');
  const [erroEmailParceiro, setErroEmailParceiro] = useState<string>('');
  const [tomadores, setTomadores] = useState(
    Array.from({ length: 4 }, () => ({ ...initialTomador }))
  );
  const [erros, setErros] = useState<{ [key: string]: string }>({});
  const [mostrarErro, setMostrarErro] = useState(false);

  // Estados para controlar o carregamento progressivo
  const [carregarOpcoesTomadores, setCarregarOpcoesTomadores] = useState(false);
  const [carregarOpcoesEmprestimo, setCarregarOpcoesEmprestimo] = useState(false);
  const [carregarOpcoesGarantia, setCarregarOpcoesGarantia] = useState(false);
  const [carregarOpcoesGarantidores, setCarregarOpcoesGarantidores] = useState(false);

  // Estado para documentos de identificação dos tomadores
  const [documentosIdentificacao, setDocumentosIdentificacao] = useState<DocumentoIdentificacao[]>([]);
  const [documentosComprovanteEndereco, setDocumentosComprovanteEndereco] = useState<DocumentoComprovanteEndereco[]>([]);
  const [documentosCertificadoCivil, setDocumentosCertificadoCivil] = useState<DocumentoCertificadoCivil[]>([]);
  const [documentosHoleriteExtrato, setDocumentosHoleriteExtrato] = useState<DocumentoHoleriteExtrato[][]>([]);
  
  // Estado para documentos do imóvel
  const [documentosMatricula, setDocumentosMatricula] = useState<File[]>([]);
  const [documentosCAR, setDocumentosCAR] = useState<File[]>([]);
  const [documentosITR, setDocumentosITR] = useState<File[]>([]);
  const [documentosCCIR, setDocumentosCCIR] = useState<File[]>([]);
  const [documentosFotosImovel, setDocumentosFotosImovel] = useState<File[]>([]);
  
  // Estado para dados do grupo do usuário
  const [userGroup, setUserGroup] = useState<{ id: string; name: string } | null>(null);
  
  // Função para buscar dados do grupo do usuário
  const fetchUserGroupData = async () => {
    try {
      if (profile?.group_id) {
        const { data: groupData, error } = await supabase
          .from('groups')
          .select('id, name')
          .eq('id', profile.group_id)
          .single();

        if (error) {
          console.error('Erro ao buscar dados do grupo:', error);
        } else {
          setUserGroup({
            id: groupData.id,
            name: groupData.name
          });
        }
      }
    } catch (error) {
      console.error('Erro ao buscar dados do grupo:', error);
    }
  };

  // Buscar dados do grupo quando o profile estiver disponível
  useEffect(() => {
    if (profile?.group_id) {
      fetchUserGroupData();
    }
  }, [profile?.group_id]);
  
  // Inicializar documentos de identificação quando a quantidade mudar
  useEffect(() => {
    const loadDocumentsFromIndexedDB = async () => {
      if (quantidade && quantidade > 0) {
        try {
          // Carregar metadados do IndexedDB
          const metadataList = await indexedDBManager.getAllMetadataByType('identificacao');
          
          // Criar array de documentos baseado na quantidade
          const documentos = Array.from({ length: quantidade }, (_, index) => {
            // Procurar metadados para este tomador
            const metadata = metadataList.find(m => m.tomadorIndex === index);
            
            if (metadata) {
              return {
                file: null, // Será carregado quando necessário
                originalName: metadata.fileName,
                uploaded: metadata.uploaded,
                filePath: metadata.filePath,
                indexedDBId: metadata.id
              };
            }
            
            return {
              file: null,
              originalName: '',
              uploaded: false
            };
          });
          
          setDocumentosIdentificacao(documentos);
        } catch (error) {
          console.error('Erro ao carregar documentos de identificação do IndexedDB:', error);
          // Fallback: criar documentos vazios
          const novosDocumentos = Array.from({ length: quantidade }, () => ({
            file: null,
            originalName: '',
            uploaded: false
          }));
          setDocumentosIdentificacao(novosDocumentos);
        }
      } else {
        setDocumentosIdentificacao([]);
      }
    };

    loadDocumentsFromIndexedDB();
  }, [quantidade]);


  // Inicializar documentos de certificado civil quando a quantidade mudar
  useEffect(() => {
    const loadDocumentsFromIndexedDB = async () => {
      if (quantidade && quantidade > 0) {
        try {
          // Carregar metadados do IndexedDB
          const metadataList = await indexedDBManager.getAllMetadataByType('certificado');
          
          // Criar array de documentos baseado na quantidade
          const documentos = Array.from({ length: quantidade }, (_, index) => {
            // Procurar metadados para este tomador
            const metadata = metadataList.find(m => m.tomadorIndex === index);
            
            if (metadata) {
              return {
                file: null, // Será carregado quando necessário
                originalName: metadata.fileName,
                uploaded: metadata.uploaded,
                filePath: metadata.filePath,
                indexedDBId: metadata.id
              };
            }
            
            return {
              file: null,
              originalName: '',
              uploaded: false
            };
          });
          
          setDocumentosCertificadoCivil(documentos);
        } catch (error) {
          console.error('Erro ao carregar documentos de certificado civil do IndexedDB:', error);
          // Fallback: criar documentos vazios
          const novosDocumentos = Array.from({ length: quantidade }, () => ({
            file: null,
            originalName: '',
            uploaded: false
          }));
          setDocumentosCertificadoCivil(novosDocumentos);
        }
      } else {
        setDocumentosCertificadoCivil([]);
      }
    };

    loadDocumentsFromIndexedDB();
  }, [quantidade]);

   // Inicializar documentos de comprovante de endereço quando a quantidade mudar
  useEffect(() => {
    const loadDocumentsFromIndexedDB = async () => {
      if (quantidade && quantidade > 0) {
        try {
          // Carregar metadados do IndexedDB
          const metadataList = await indexedDBManager.getAllMetadataByType('comprovante');
          
          // Criar array de documentos baseado na quantidade
          const documentos = Array.from({ length: quantidade }, (_, index) => {
            // Procurar metadados para este tomador
            const metadata = metadataList.find(m => m.tomadorIndex === index);
            
            if (metadata) {
              return {
                file: null, // Será carregado quando necessário
                originalName: metadata.fileName,
                uploaded: metadata.uploaded,
                filePath: metadata.filePath,
                indexedDBId: metadata.id
              };
            }
            
            return {
              file: null,
              originalName: '',
              uploaded: false
            };
          });
          
          setDocumentosComprovanteEndereco(documentos);
        } catch (error) {
          console.error('Erro ao carregar documentos de comprovante do IndexedDB:', error);
          // Fallback: criar documentos vazios
          const novosDocumentos = Array.from({ length: quantidade }, () => ({
            file: null,
            originalName: '',
            uploaded: false
          }));
          setDocumentosComprovanteEndereco(novosDocumentos);
        }
      } else {
        setDocumentosComprovanteEndereco([]);
      }
    };

    loadDocumentsFromIndexedDB();
  }, [quantidade]);



  // Inicializar documentos de holerite e extrato quando a quantidade mudar
  useEffect(() => {
    const loadDocumentsFromIndexedDB = async () => {
      if (quantidade && quantidade > 0) {
        try {
          // Carregar metadados do IndexedDB
          const metadataList = await indexedDBManager.getAllMetadataByType('holerite_extrato');
          
          // Criar array de documentos baseado na quantidade
          const documentos = Array.from({ length: quantidade }, (_, tomadorIndex) => {
            // Procurar metadados para este tomador
            const tomadorMetadata = metadataList.filter(m => m.tomadorIndex === tomadorIndex);
            
            // Agrupar por campoId para evitar duplicatas
            const documentosPorCampo = new Map();
            
            tomadorMetadata.forEach(metadata => {
              const campoId = metadata.campoId || '';
              if (campoId && !documentosPorCampo.has(campoId)) {
                documentosPorCampo.set(campoId, {
                  file: null, // Será carregado quando necessário
                  originalName: metadata.fileName,
                  uploaded: metadata.uploaded,
                  filePath: metadata.filePath,
                  indexedDBId: metadata.id,
                  tipo: metadata.tipo as 'holerite' | 'extrato',
                  campoId: campoId
                });
              }
            });
            
            return Array.from(documentosPorCampo.values());
          });
          
          setDocumentosHoleriteExtrato(documentos);
        } catch (error) {
          console.error('Erro ao carregar documentos de holerite/extrato do IndexedDB:', error);
          // Fallback: criar documentos vazios
          const novosDocumentos = Array.from({ length: quantidade }, () => []);
          setDocumentosHoleriteExtrato(novosDocumentos);
        }
      } else {
        setDocumentosHoleriteExtrato([]);
      }
    };

    loadDocumentsFromIndexedDB();
  }, [quantidade]);




  const limparErro = (campo: string) => {
    setErros(prev => {
      const novo = { ...prev };
      delete novo[campo];
      return novo;
    });
  };

  // Função para gerenciar upload de documento de identificação
  const handleIdentificacaoChange = async (tomadorIndex: number, file: File | null) => {
    if (!file) return;

    try {
      // Salvar arquivo no IndexedDB
      const indexedDBId = await saveDocumentToIndexedDB(file, tomadorIndex, 'identificacao');
      
      setDocumentosIdentificacao(prev => {
        const novo = [...prev];
        novo[tomadorIndex] = {
          file,
          originalName: file.name,
          uploaded: false,
          indexedDBId
        };
        
        return novo;
      });
    } catch (error) {
      console.error('Erro ao salvar documento de identificação:', error);
    }
  };

  // Função para gerenciar upload de documento de comprovante de endereço
  const handleComprovanteEnderecoChange = async (tomadorIndex: number, file: File | null) => {
    if (!file) return;

    try {
      // Salvar arquivo no IndexedDB
      const indexedDBId = await saveDocumentToIndexedDB(file, tomadorIndex, 'comprovante');
      
      setDocumentosComprovanteEndereco(prev => {
        const novo = [...prev];
        novo[tomadorIndex] = {
          file,
          originalName: file.name,
          uploaded: false,
          indexedDBId
        };
        
        return novo;
      });
    } catch (error) {
      console.error('Erro ao salvar documento de comprovante:', error);
    }
  };

  // Função para gerenciar upload de documento de certificado civil
  const handleCertificadoCivilChange = async (tomadorIndex: number, file: File | null) => {
    if (!file) return;

    try {
      // Salvar arquivo no IndexedDB
      const indexedDBId = await saveDocumentToIndexedDB(file, tomadorIndex, 'certificado');
      
      setDocumentosCertificadoCivil(prev => {
        const novo = [...prev];
        novo[tomadorIndex] = {
          file,
          originalName: file.name,
          uploaded: false,
          indexedDBId
        };
        
        return novo;
      });
    } catch (error) {
      console.error('Erro ao salvar documento de certificado civil:', error);
    }
  };

  // Função para gerenciar upload de documento de holerite e extrato
  const handleHoleriteExtratoChange = async (
    tomadorIndex: number, 
    file: File | null, 
    tipo: 'holerite' | 'extrato',
    campoIndex: number
  ) => {
    if (!file) return;

    try {
      // Criar um identificador único para cada campo
      const campoId = `${tipo}_${campoIndex}`;
      
      // Primeiro, remover documento antigo do IndexedDB se existir
      const metadataList = await indexedDBManager.getAllMetadataByType('holerite_extrato');
      const existingDoc = metadataList.find(m => 
        m.tomadorIndex === tomadorIndex && 
        m.campoId === campoId
      );
      
      if (existingDoc) {
        await indexedDBManager.removeDocument(existingDoc.id);
      }
      
      // Salvar novo arquivo no IndexedDB
      const indexedDBId = await saveDocumentToIndexedDB(file, tomadorIndex, 'holerite_extrato', tipo, campoId);
  
      setDocumentosHoleriteExtrato(prev => {
        const novo = [...prev];
        if (!novo[tomadorIndex]) {
          novo[tomadorIndex] = [];
        }
        
        // Verificar se já existe um documento para este campo específico
        const existingIndex = novo[tomadorIndex].findIndex(doc => doc.campoId === campoId);
        
        if (existingIndex >= 0) {
          // Substituir o documento existente
          novo[tomadorIndex][existingIndex] = {
            file,
            originalName: file.name,
            uploaded: false,
            indexedDBId,
            tipo,
            campoId
          };
        } else {
          // Adicionar novo documento
          novo[tomadorIndex].push({
            file,
            originalName: file.name,
            uploaded: false,
            indexedDBId,
            tipo,
            campoId
          });
        }
  
        return novo;
      });
    } catch (error) {
      console.error('Erro ao salvar documento de holerite/extrato:', error);
    }
  };
  

  // Função para converter valor monetário para número
  const converterValorMonetario = (valor: string): number => {
    if (!valor || valor === 'R$ 0,00') return 0;
    const numero = valor.replace(/[^\d,]/g, '').replace(',', '.');
    return parseFloat(numero) || 0;
  };

  // Função para formatar valor monetário
  const formatarValorMonetario = (valor: number): string => {
    return `R$ ${valor.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
  };

  // Função para calcular renda total
  const calcularRendaTotal = (rendaFormal: string, rendaInformal: string): string => {
    const valorFormal = converterValorMonetario(rendaFormal);
    const valorInformal = converterValorMonetario(rendaInformal);
    const total = valorFormal + valorInformal;
    return formatarValorMonetario(total);
  };

  // Função para atualizar renda total automaticamente
  const atualizarRendaTotal = (idx: number) => {
    const tomador = tomadores[idx];
    if (!tomador) return;

    const isPessoaJuridica = tomador.tipoPessoa?.Name?.toLowerCase() === 'pessoa jurídica';
    const isEmpresario = tomador.qualificacaoProfissional?.Name?.toLowerCase() === 'empresário(a)';
    const isAutonomo = tomador.qualificacaoProfissional?.Name?.toLowerCase() === 'autônomo(a)';
    const rendaFormalNaoSeAplica = tomador.comprovacaoRendaFormal?.Name?.toLowerCase() === 'não se aplica';
    const rendaInformalNaoSeAplica = tomador.comprovacaoRendaInformal?.Name?.toLowerCase() === 'não se aplica';

    // Para pessoa jurídica, empresário ou autônomo, considera apenas renda informal
    const rendaFormal = (isPessoaJuridica || isEmpresario || isAutonomo) ? 'R$ 0,00' : (rendaFormalNaoSeAplica ? 'R$ 0,00' : tomador.rendaFormal);
    const rendaInformal = rendaInformalNaoSeAplica ? 'R$ 0,00' : tomador.rendaInformal;

    const rendaTotal = calcularRendaTotal(rendaFormal, rendaInformal);

    setTomadores(prev => {
      const novo = [...prev];
      novo[idx] = { 
        ...novo[idx], 
        rendaFormal: rendaFormalNaoSeAplica ? 'R$ 0,00' : novo[idx].rendaFormal,
        rendaInformal: rendaInformalNaoSeAplica ? 'R$ 0,00' : novo[idx].rendaInformal,
        rendaTotalInformada: rendaTotal
      };
      return novo;
    });
  };

  // useEffect para atualizar renda total automaticamente quando os valores mudarem
  useEffect(() => {
    let hasChanges = false;
    const updatedTomadores = tomadores.map((tomador, idx) => {
      if (!tomador) return tomador;
      
      const isPessoaJuridica = tomador.tipoPessoa?.Name?.toLowerCase() === 'pessoa jurídica';
      const isEmpresario = tomador.qualificacaoProfissional?.Name?.toLowerCase() === 'empresário(a)';
      const isAutonomo = tomador.qualificacaoProfissional?.Name?.toLowerCase() === 'autônomo(a)';
      const rendaFormalNaoSeAplica = tomador.comprovacaoRendaFormal?.Name?.toLowerCase() === 'não se aplica';
      const rendaInformalNaoSeAplica = tomador.comprovacaoRendaInformal?.Name?.toLowerCase() === 'não se aplica';

      // Para pessoa jurídica, empresário ou autônomo, considera apenas renda informal
      // Para outros casos, força o valor para R$ 0,00 quando "Não se aplica" for selecionado
      const rendaFormal = (isPessoaJuridica || isEmpresario || isAutonomo) 
        ? 'R$ 0,00' 
        : (rendaFormalNaoSeAplica ? 'R$ 0,00' : tomador.rendaFormal);
      const rendaInformal = rendaInformalNaoSeAplica ? 'R$ 0,00' : tomador.rendaInformal;

      const rendaTotal = calcularRendaTotal(rendaFormal, rendaInformal);

      // Verifica se precisa atualizar
      const needsUpdate = 
        (rendaFormalNaoSeAplica && tomador.rendaFormal !== 'R$ 0,00') ||
        (rendaInformalNaoSeAplica && tomador.rendaInformal !== 'R$ 0,00') ||
        tomador.rendaTotalInformada !== rendaTotal;

      if (needsUpdate) {
        hasChanges = true;
        return {
          ...tomador,
          rendaFormal: rendaFormal,
          rendaInformal: rendaInformal,
          rendaTotalInformada: rendaTotal
        };
      }
      return tomador;
    });

    if (hasChanges) {
      setTomadores(updatedTomadores);
    }
  }, [tomadores]);

  // Estado dos dados do empréstimo
  const [emprestimo, setEmprestimo] = useState({ ...initialEmprestimo });
  const [errosEmprestimo, setErrosEmprestimo] = useState<{ [key: string]: string }>({});
  const [mostrarErroEmprestimo, setMostrarErroEmprestimo] = useState(false);

  // Estado dos dados da garantia
  const [garantia, setGarantia] = useState({ ...initialGarantia });
  const [errosGarantia, setErrosGarantia] = useState<{ [key: string]: string }>({});
  const [mostrarErroGarantia, setMostrarErroGarantia] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);

  // Calcular valores para o hook dinâmico
  const valorImovelNumerico = garantia.valorGarantia ? parseFloat(garantia.valorGarantia.replace(/[^\d,]/g, '').replace(',', '.')) || 0 : 0;
  const valorSolicitadoNumerico = emprestimo.valorSolicitado ? parseFloat(emprestimo.valorSolicitado.replace(/[^\d,]/g, '').replace(',', '.')) || 0 : 0;
  
  // Hook dinâmico para calcular LTV (sempre no nível superior do componente)
  const dynamicLTV = useDynamicLTV({
    cityName: garantia.cidadeGarantia?.Name || '',
    uf: garantia.unidadeFederativaSigla || '',
    valorImovel: valorImovelNumerico,
    valorSolicitado: valorSolicitadoNumerico,
    isRural: garantia.ruralUrbano?.Name === 'Rural',
    isAverbado: garantia.imovelAverbado === true,
    tipoConstrucao: garantia.tipoGarantia?.Name || ''
  });

  // Função para converter sigla do estado para nome completo
  const converterSiglaParaNomeEstado = (sigla: string): string => {
    const estados: { [key: string]: string } = {
      'AC': 'Acre',
      'AL': 'Alagoas',
      'AP': 'Amapá',
      'AM': 'Amazonas',
      'BA': 'Bahia',
      'CE': 'Ceará',
      'DF': 'Distrito Federal',
      'ES': 'Espírito Santo',
      'GO': 'Goiás',
      'MA': 'Maranhão',
      'MT': 'Mato Grosso',
      'MS': 'Mato Grosso do Sul',
      'MG': 'Minas Gerais',
      'PA': 'Pará',
      'PB': 'Paraíba',
      'PR': 'Paraná',
      'PE': 'Pernambuco',
      'PI': 'Piauí',
      'RJ': 'Rio de Janeiro',
      'RN': 'Rio Grande do Norte',
      'RS': 'Rio Grande do Sul',
      'RO': 'Rondônia',
      'RR': 'Roraima',
      'SC': 'Santa Catarina',
      'SP': 'São Paulo',
      'SE': 'Sergipe',
      'TO': 'Tocantins'
    };
    
    return estados[sigla.toUpperCase()] || sigla;
  };

  // Função para converter nome do estado para sigla
  const converterNomeParaSiglaEstado = (nome: string): string => {
    const estados: { [key: string]: string } = {
      'Acre': 'AC',
      'Alagoas': 'AL',
      'Amapá': 'AP',
      'Amazonas': 'AM',
      'Bahia': 'BA',
      'Ceará': 'CE',
      'Distrito Federal': 'DF',
      'Espírito Santo': 'ES',
      'Goiás': 'GO',
      'Maranhão': 'MA',
      'Mato Grosso': 'MT',
      'Mato Grosso do Sul': 'MS',
      'Minas Gerais': 'MG',
      'Pará': 'PA',
      'Paraíba': 'PB',
      'Paraná': 'PR',
      'Pernambuco': 'PE',
      'Piauí': 'PI',
      'Rio de Janeiro': 'RJ',
      'Rio Grande do Norte': 'RN',
      'Rio Grande do Sul': 'RS',
      'Rondônia': 'RO',
      'Roraima': 'RR',
      'Santa Catarina': 'SC',
      'São Paulo': 'SP',
      'Sergipe': 'SE',
      'Tocantins': 'TO'
    };
    
    return estados[nome] || nome;
  };

  // Função para validar formato de e-mail
  const validarEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Função para buscar endereço por CEP
  const buscarEnderecoPorCep = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '');
    
    if (cepLimpo.length !== 8) {
      return;
    }

    setBuscandoCep(true);
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        console.error('CEP não encontrado');
        return;
      }

      // Converter sigla do estado para nome completo
      const nomeEstado = converterSiglaParaNomeEstado(data.uf || '');
      const siglaEstado = data.uf || '';

      // Atualizar os campos com os dados do CEP
      setGarantia(prev => {
        // Combinar logradouro e bairro no formato solicitado
        const enderecoCompleto = data.logradouro && data.bairro 
          ? `${data.logradouro} - ${data.bairro}`
          : data.logradouro || '';
          
        const novaGarantia = {
          ...prev,
          enderecoGarantia: enderecoCompleto,
          cidadeGarantia: { Id: '', Name: data.localidade || '' },
          unidadeFederativa: { Id: '', Name: nomeEstado },
          unidadeFederativaSigla: siglaEstado
        };
        
        // Salvar no localStorage
        localStorage.setItem(GARANTIA_STORAGE_KEY, JSON.stringify(novaGarantia));
        
        return novaGarantia;
      });
    } catch (error) {
    } finally {
      setBuscandoCep(false);
    }
  };

  // Estado dos dados dos garantidores
  const [garantidores, setGarantidores] = useState<typeof initialGarantidor[]>([]);
  const [showGarantidorModal, setShowGarantidorModal] = useState(false);
  const [showQtdGarantidores, setShowQtdGarantidores] = useState(false);
  const [showGarantidores, setShowGarantidores] = useState(false);
  const [qtdGarantidores, setQtdGarantidores] = useState(1);
  const [qtdGarantidoresId, setQtdGarantidoresId] = useState<number | null>(null);
  const [errosGarantidores, setErrosGarantidores] = useState<{ [key: string]: string }>({});
  const [mostrarErroGarantidores, setMostrarErroGarantidores] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [mostrarErroRendaMinima, setMostrarErroRendaMinima] = useState(false);
  const [isEnviando, setIsEnviando] = useState(false);
  const [showModalErroEnvio, setShowModalErroEnvio] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string>('');
  const [showModalLimparDados, setShowModalLimparDados] = useState(false);
  const [showBannerIRPF, setShowBannerIRPF] = useState(false);

  // Função para verificar se deve mostrar banner do IRPF
  const verificarValorIRPF = (valor: string) => {
    if (!valor) {
      setShowBannerIRPF(false);
      return;
    }
    
    // Converter valor monetário para número
    const valorNumerico = parseFloat(valor.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
    
    // Mostrar banner se valor for maior que R$ 200.000
    if (valorNumerico > 200000) {
      setShowBannerIRPF(true);
    } else {
      setShowBannerIRPF(false);
    }
  };

  // Função para verificar se valor solicitado excede crédito disponível
  // Nova regra: valor solicitado não pode ser maior que 50% do valor do imóvel
  const verificarValorExcedeCredito = () => {
    if (!garantia.valorGarantia || !garantia.tipoGarantia) return false;
    
    // Verificar valor mínimo do imóvel (R$ 150.000)
    if (valorImovelNumerico < 150000) {
      return true; // Bloqueia se valor do imóvel for menor que R$ 150.000
    }
    
    // Nova regra: valor solicitado não pode ser maior que 50% do valor do imóvel
    const valorMaximoPermitido = (valorImovelNumerico * 50) / 100;
    
    return valorSolicitadoNumerico > valorMaximoPermitido;
  };

  // Função para calcular LTV (Loan-to-Value) baseado nas regras de imóveis
  const calcularLTV = (valorImovel, tipoImovel, imovelAverbado, regiao) => {
    const valorNumerico = parseFloat(valorImovel.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
    
    // Imóveis vetados
    const imoveisVetados = ['industrial', 'fábrica', 'chácara', 'hara', 'terreno'];
    const tipoImovelLower = tipoImovel?.toLowerCase() || '';
    
    if (imoveisVetados.some(vetado => tipoImovelLower.includes(vetado))) {
      return {
        ltv: 0,
        valorCredito: 0,
        motivo: 'Tipo de imóvel não aceito',
        categoria: 'VETADO'
      };
    }

    // Regras de LTV baseadas nas especificações
    
    // 30% de LTV - casos específicos
    if (!imovelAverbado || valorNumerico < 300000) {
      return {
        ltv: 30,
        valorCredito: valorNumerico * 0.30,
        motivo: 'Sem averbação ou valor < R$ 300.000',
        categoria: 'LIMITADO_30'
      };
    }

    // 40% de LTV - com averbação e valor entre R$ 300.000 - R$ 700.000
    if (imovelAverbado && valorNumerico >= 300000 && valorNumerico <= 700000) {
      return {
        ltv: 40,
        valorCredito: valorNumerico * 0.40,
        motivo: 'Com averbação e valor entre R$ 300.000 - R$ 700.000',
        categoria: 'INTERMEDIARIO_40'
      };
    }

    // 50% de LTV - com averbação e valor > R$ 700.000
    if (imovelAverbado && valorNumerico > 700000) {
      return {
        ltv: 50,
        valorCredito: valorNumerico * 0.50,
        motivo: 'Com averbação e valor > R$ 700.000',
        categoria: 'MAXIMO_50'
      };
    }

    // Fallback para 30%
    return {
      ltv: 30,
      valorCredito: valorNumerico * 0.30,
      motivo: 'Caso padrão - 30% de LTV',
      categoria: 'PADRAO_30'
    };
  };

  // Hooks com carregamento progressivo
  const { options, loading, error } = usePloomesOptions(QUANTIDADE_TOMADORES_OPTIONS_ID);
  const { options: quantidadeGarantidoresOptions, loading: loadingGarantidores, error: errorGarantidores } = usePloomesOptions(carregarOpcoesGarantidores ? QUANTIDADE_GARANTIDORES_OPTIONS_ID : undefined);
  
  // Hooks de empréstimo - carregam apenas quando necessário
  const amortizacaoOptions = usePloomesOptions(carregarOpcoesEmprestimo ? 44254 : undefined);
  const carenciaOptions = usePloomesOptions(carregarOpcoesEmprestimo ? 46299 : undefined);
  const motivoEmprestimoOptions = usePloomesOptions(carregarOpcoesEmprestimo ? 31247 : undefined);
  
  // Hooks de garantia - carregam apenas quando necessário
  const dividaITROptions = usePloomesOptions(carregarOpcoesGarantia ? 46865 : undefined);
  const pertenceTomadorOptions = usePloomesOptions(carregarOpcoesGarantia ? 31246 : undefined);
  const cidadeGarantiaOptions = useIBGECities();
  const ruralUrbanoOptions = usePloomesOptions(carregarOpcoesGarantia ? 46826 : undefined);
  const unidadeFederativaOptions = usePloomesOptions(carregarOpcoesGarantia ? 38986 : undefined);
  const comQuemEstaFinanciadaOptions = usePloomesOptions(carregarOpcoesGarantia ? 32453 : undefined);
  const utilizacaoGarantiaOptions = usePloomesOptions(carregarOpcoesGarantia ? 31833 : undefined);
  const tipoGarantiaOptions = usePloomesOptions(carregarOpcoesGarantia ? 31459 : undefined);

  // Hooks de opções para todos os tomadores - sempre declarados, mas controlados pelo carregarOpcoesTomadores
  const estadoCivilOptions0 = usePloomesOptions(carregarOpcoesTomadores ? TOMADORES_OPTIONS_IDS[0]?.estadoCivil : undefined);
  const estadoCivilOptions1 = usePloomesOptions(carregarOpcoesTomadores ? TOMADORES_OPTIONS_IDS[1]?.estadoCivil : undefined);
  const estadoCivilOptions2 = usePloomesOptions(carregarOpcoesTomadores ? TOMADORES_OPTIONS_IDS[2]?.estadoCivil : undefined);
  const estadoCivilOptions3 = usePloomesOptions(carregarOpcoesTomadores ? TOMADORES_OPTIONS_IDS[3]?.estadoCivil : undefined);
  const estadoCivilOptionsArr = [estadoCivilOptions0, estadoCivilOptions1, estadoCivilOptions2, estadoCivilOptions3];

  const tipoPessoaOptions0 = usePloomesOptions(carregarOpcoesTomadores ? TOMADORES_OPTIONS_IDS[0]?.tipoPessoa : undefined);
  const tipoPessoaOptions1 = usePloomesOptions(carregarOpcoesTomadores ? TOMADORES_OPTIONS_IDS[1]?.tipoPessoa : undefined);
  const tipoPessoaOptions2 = usePloomesOptions(carregarOpcoesTomadores ? TOMADORES_OPTIONS_IDS[2]?.tipoPessoa : undefined);
  const tipoPessoaOptions3 = usePloomesOptions(carregarOpcoesTomadores ? TOMADORES_OPTIONS_IDS[3]?.tipoPessoa : undefined);
  const tipoPessoaOptionsArr = [tipoPessoaOptions0, tipoPessoaOptions1, tipoPessoaOptions2, tipoPessoaOptions3];

  const qualificacaoProfissaoOptions0 = usePloomesOptions(carregarOpcoesTomadores ? TOMADORES_OPTIONS_IDS[0]?.qualificacaoProfissao : undefined);
  const qualificacaoProfissaoOptions1 = usePloomesOptions(carregarOpcoesTomadores ? TOMADORES_OPTIONS_IDS[1]?.qualificacaoProfissao : undefined);
  const qualificacaoProfissaoOptions2 = usePloomesOptions(carregarOpcoesTomadores ? TOMADORES_OPTIONS_IDS[2]?.qualificacaoProfissao : undefined);
  const qualificacaoProfissaoOptions3 = usePloomesOptions(carregarOpcoesTomadores ? TOMADORES_OPTIONS_IDS[3]?.qualificacaoProfissao : undefined);
  const qualificacaoProfissaoOptionsArr = [qualificacaoProfissaoOptions0, qualificacaoProfissaoOptions1, qualificacaoProfissaoOptions2, qualificacaoProfissaoOptions3];

  const comprovacaoRendaFormalOptions0 = usePloomesOptions(carregarOpcoesTomadores ? TOMADORES_OPTIONS_IDS[0]?.comprovacaoRendaFormal : undefined);
  const comprovacaoRendaFormalOptions1 = usePloomesOptions(carregarOpcoesTomadores ? TOMADORES_OPTIONS_IDS[1]?.comprovacaoRendaFormal : undefined);
  const comprovacaoRendaFormalOptions2 = usePloomesOptions(carregarOpcoesTomadores ? TOMADORES_OPTIONS_IDS[2]?.comprovacaoRendaFormal : undefined);
  const comprovacaoRendaFormalOptions3 = usePloomesOptions(carregarOpcoesTomadores ? TOMADORES_OPTIONS_IDS[3]?.comprovacaoRendaFormal : undefined);
  const comprovacaoRendaFormalOptionsArr = [comprovacaoRendaFormalOptions0, comprovacaoRendaFormalOptions1, comprovacaoRendaFormalOptions2, comprovacaoRendaFormalOptions3];

  const comprovacaoRendaInformalOptions0 = usePloomesOptions(carregarOpcoesTomadores ? TOMADORES_OPTIONS_IDS[0]?.comprovacaoRendaInformal : undefined);
  const comprovacaoRendaInformalOptions1 = usePloomesOptions(carregarOpcoesTomadores ? TOMADORES_OPTIONS_IDS[1]?.comprovacaoRendaInformal : undefined);
  const comprovacaoRendaInformalOptions2 = usePloomesOptions(carregarOpcoesTomadores ? TOMADORES_OPTIONS_IDS[2]?.comprovacaoRendaInformal : undefined);
  const comprovacaoRendaInformalOptions3 = usePloomesOptions(carregarOpcoesTomadores ? TOMADORES_OPTIONS_IDS[3]?.comprovacaoRendaInformal : undefined);
  const comprovacaoRendaInformalOptionsArr = [comprovacaoRendaInformalOptions0, comprovacaoRendaInformalOptions1, comprovacaoRendaInformalOptions2, comprovacaoRendaInformalOptions3];

  const quantidadeSociosOptions0 = usePloomesOptions(carregarOpcoesTomadores ? TOMADORES_OPTIONS_IDS[0]?.quantidadeSocios : undefined);
  const quantidadeSociosOptions1 = usePloomesOptions(carregarOpcoesTomadores ? TOMADORES_OPTIONS_IDS[1]?.quantidadeSocios : undefined);
  const quantidadeSociosOptions2 = usePloomesOptions(carregarOpcoesTomadores ? TOMADORES_OPTIONS_IDS[2]?.quantidadeSocios : undefined);
  const quantidadeSociosOptions3 = usePloomesOptions(carregarOpcoesTomadores ? TOMADORES_OPTIONS_IDS[3]?.quantidadeSocios : undefined);
  const quantidadeSociosOptionsArr = [quantidadeSociosOptions0, quantidadeSociosOptions1, quantidadeSociosOptions2, quantidadeSociosOptions3];

  const numeroAdminOptions0 = usePloomesOptions(carregarOpcoesTomadores ? TOMADORES_OPTIONS_IDS[0]?.numeroAdmin : undefined);
  const numeroAdminOptions1 = usePloomesOptions(carregarOpcoesTomadores ? TOMADORES_OPTIONS_IDS[1]?.numeroAdmin : undefined);
  const numeroAdminOptions2 = usePloomesOptions(carregarOpcoesTomadores ? TOMADORES_OPTIONS_IDS[2]?.numeroAdmin : undefined);
  const numeroAdminOptions3 = usePloomesOptions(carregarOpcoesTomadores ? TOMADORES_OPTIONS_IDS[3]?.numeroAdmin : undefined);
  const numeroAdminOptionsArr = [numeroAdminOptions0, numeroAdminOptions1, numeroAdminOptions2, numeroAdminOptions3];

  // Hooks de opções para garantidores - sempre declarados, mas controlados pelo carregarOpcoesGarantidores
  const estadoCivilGarantidoresOptions0 = usePloomesOptions(carregarOpcoesGarantidores ? GARANTIDORES_OPTIONS_IDS[0]?.estadoCivil : undefined);
  const estadoCivilGarantidoresOptions1 = usePloomesOptions(carregarOpcoesGarantidores ? GARANTIDORES_OPTIONS_IDS[1]?.estadoCivil : undefined);
  const estadoCivilGarantidoresOptions2 = usePloomesOptions(carregarOpcoesGarantidores ? GARANTIDORES_OPTIONS_IDS[2]?.estadoCivil : undefined);
  const estadoCivilGarantidoresOptions3 = usePloomesOptions(carregarOpcoesGarantidores ? GARANTIDORES_OPTIONS_IDS[3]?.estadoCivil : undefined);
  const estadoCivilGarantidoresOptionsArr = [estadoCivilGarantidoresOptions0, estadoCivilGarantidoresOptions1, estadoCivilGarantidoresOptions2, estadoCivilGarantidoresOptions3];
  
  const tipoPessoaOptionsGarantidor0 = usePloomesOptions(carregarOpcoesTomadores ? OPTIONS_GARANTIDORES_IDS[0]?.tipoPessoa : undefined);
  const tipoPessoaOptionsGarantidor1 = usePloomesOptions(carregarOpcoesTomadores ? OPTIONS_GARANTIDORES_IDS[1]?.tipoPessoa : undefined);
  const tipoPessoaOptionsGarantidor2 = usePloomesOptions(carregarOpcoesTomadores ? OPTIONS_GARANTIDORES_IDS[2]?.tipoPessoa : undefined);
  const tipoPessoaOptionsGarantidor3 = usePloomesOptions(carregarOpcoesTomadores ? OPTIONS_GARANTIDORES_IDS[3]?.tipoPessoa : undefined);
  const tipoPessoaOptionsGarantidorArr = [tipoPessoaOptionsGarantidor0, tipoPessoaOptionsGarantidor1, tipoPessoaOptionsGarantidor2, tipoPessoaOptionsGarantidor3];

  // Hook para grau de parentesco - carrega apenas quando necessário
  const grauParentescoOptions = usePloomesOptions(carregarOpcoesGarantidores ? GRAU_PARENTESCO_OPTIONS_ID : undefined);

  // Opções Sim/Não para campos booleanos
  const opcoesSimNao = [
    { Id: 'true', Name: 'Sim' },
    { Id: 'false', Name: 'Não' }
  ];

  // Opções para tipo de pessoa
  const opcoesTipoPessoa = [
    { Id: '1', Name: 'Pessoa Física' },
    { Id: '2', Name: 'Pessoa Jurídica' }
  ];

  // useEffect para controlar carregamento progressivo das opções
  useEffect(() => {
    // Carregar opções de tomadores quando entrar na etapa de tomadores
    if (etapa > 0 && etapa <= (quantidade || 0)) {
      if (!carregarOpcoesTomadores) {
        setCarregarOpcoesTomadores(true);
      }
    }
  }, [etapa, quantidade, carregarOpcoesTomadores]);

  useEffect(() => {
    // Carregar opções de empréstimo quando entrar na etapa de empréstimo
    if (etapa === (quantidade || 0) + 1) {
      if (!carregarOpcoesEmprestimo) {
        setCarregarOpcoesEmprestimo(true);
      }
    }
  }, [etapa, quantidade, carregarOpcoesEmprestimo]);

  useEffect(() => {
    // Carregar opções de garantia quando entrar na etapa de garantia
    if (etapa === (quantidade || 0) + 2) {
      if (!carregarOpcoesGarantia) {
        setCarregarOpcoesGarantia(true);
      }
    }
  }, [etapa, quantidade, carregarOpcoesGarantia]);

  useEffect(() => {
    // Carregar opções de garantidores quando entrar na etapa de garantidores
    if (showGarantidores && (etapa === (quantidade || 0) + 3 || etapa >= (quantidade || 0) + 4)) {
      if (!carregarOpcoesGarantidores) {
        setCarregarOpcoesGarantidores(true);
      }
    }
  }, [etapa, quantidade, showGarantidores, carregarOpcoesGarantidores]);

  useEffect(() => {
    const savedQtd = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedQtd) {
      try {
        const { Id, Name } = JSON.parse(savedQtd);
        setQuantidade(Name ? Number(Name) : null);
        setQuantidadeId(Id ?? null);
      } catch {}
    }
    const savedTomadores = localStorage.getItem(TOMADORES_STORAGE_KEY);
    if (savedTomadores) {
      try {
        const parsed = JSON.parse(savedTomadores);
        if (Array.isArray(parsed) && parsed.length === 4) setTomadores(parsed);
      } catch {}
    }
  }, []);



  useEffect(() => {
    localStorage.setItem(TOMADORES_STORAGE_KEY, JSON.stringify(tomadores));
  }, [tomadores]);

  // Carregar dados do empréstimo do localStorage ao iniciar
  useEffect(() => {
    const savedEmprestimo = localStorage.getItem(EMPRESTIMO_STORAGE_KEY);
    if (savedEmprestimo) {
      try {
        const parsed = JSON.parse(savedEmprestimo);
        setEmprestimo({ ...initialEmprestimo, ...parsed });
      } catch {}
    }
  }, []);

  // Salvar dados do empréstimo no localStorage sempre que mudarem
  useEffect(() => {
    localStorage.setItem(EMPRESTIMO_STORAGE_KEY, JSON.stringify(emprestimo));
  }, [emprestimo]);

  // Carregar dados da garantia do localStorage ao iniciar
  useEffect(() => {
    const savedGarantia = localStorage.getItem(GARANTIA_STORAGE_KEY);
    if (savedGarantia) {
      try {
        const parsed = JSON.parse(savedGarantia);
        
        // Se dividaITR é boolean (formato antigo), remover do localStorage e usar o formato novo
        if (typeof parsed.dividaITR === 'boolean') {
          delete parsed.dividaITR;
          localStorage.setItem(GARANTIA_STORAGE_KEY, JSON.stringify(parsed));
        }
        
        setGarantia({ ...initialGarantia, ...parsed });
      } catch (error) {
        console.error('Erro ao carregar dados da garantia inicialmente:', error);
      }
    }
  }, []);

  // Novo useEffect para restaurar dados da garantia após as opções serem carregadas
  useEffect(() => {
    // Verificar se todas as opções da garantia foram carregadas
    const allOptionsLoaded = 
      pertenceTomadorOptions.loading === false &&
      utilizacaoGarantiaOptions.loading === false &&
      tipoGarantiaOptions.loading === false &&
      cidadeGarantiaOptions.loading === false &&
      ruralUrbanoOptions.loading === false &&
      unidadeFederativaOptions.loading === false &&
      comQuemEstaFinanciadaOptions.loading === false &&
      dividaITROptions.loading === false;

    if (allOptionsLoaded) {
      const savedGarantia = localStorage.getItem(GARANTIA_STORAGE_KEY);
      if (savedGarantia) {
        try {
          const parsed = JSON.parse(savedGarantia);
          
          // Se dividaITR é boolean (formato antigo), remover do localStorage e usar o formato novo
          if (typeof parsed.dividaITR === 'boolean') {
            delete parsed.dividaITR;
            localStorage.setItem(GARANTIA_STORAGE_KEY, JSON.stringify(parsed));
          }
          
          setGarantia({ ...initialGarantia, ...parsed });
        } catch (error) {
          console.error('Erro ao restaurar dados da garantia:', error);
        }
      }
    }
  }, [
    pertenceTomadorOptions.loading,
    utilizacaoGarantiaOptions.loading,
    tipoGarantiaOptions.loading,
    cidadeGarantiaOptions.loading,
    ruralUrbanoOptions.loading,
    unidadeFederativaOptions.loading,
    comQuemEstaFinanciadaOptions.loading,
    dividaITROptions.loading
  ]);

  // Salvar dados da garantia no localStorage sempre que mudarem
  useEffect(() => {
    localStorage.setItem(GARANTIA_STORAGE_KEY, JSON.stringify(garantia));
  }, [garantia]);

  // Carregar quantidade de garantidores do localStorage
  useEffect(() => {
    const savedQtdGarantidores = localStorage.getItem(QUANTIDADE_GARANTIDORES_STORAGE_KEY);
    if (savedQtdGarantidores) {
      try {
        const { Id, Name } = JSON.parse(savedQtdGarantidores);
        setQtdGarantidores(Number(Name));
        setQtdGarantidoresId(Id);
      } catch {}
    }
  }, []);

  // Carregar garantidores do localStorage (após carregar a quantidade)
  useEffect(() => {
    if (qtdGarantidores > 0) {
      const saved = localStorage.getItem(GARANTIDORES_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length === qtdGarantidores) {
            setGarantidores(parsed);
          } else {
            // Se os dados salvos não correspondem à quantidade, inicializar com dados vazios
            setGarantidores(Array.from({ length: qtdGarantidores }, () => ({ ...initialGarantidor })));
          }
        } catch (error) {
          // Se houver erro, inicializar com dados vazios
          setGarantidores(Array.from({ length: qtdGarantidores }, () => ({ ...initialGarantidor })));
        }
      } else {
        // Se não há dados salvos, inicializar com dados vazios
        setGarantidores(Array.from({ length: qtdGarantidores }, () => ({ ...initialGarantidor })));
      }
    }
  }, [qtdGarantidores]);

  // Salvar garantidores no localStorage
  useEffect(() => {
    if (garantidores.length > 0 && qtdGarantidores > 0) {
      localStorage.setItem(GARANTIDORES_STORAGE_KEY, JSON.stringify(garantidores));
    }
  }, [garantidores, qtdGarantidores]);



  // Lógica para mostrar etapa garantidores
  useEffect(() => {
    if (garantia.garantiaPertenceTomador?.Name === 'Imóvel de terceiro') {
      setShowGarantidores(true);
    } else {
      setShowGarantidores(false);
      setShowQtdGarantidores(false);
      setShowGarantidorModal(false);
    }
  }, [garantia.garantiaPertenceTomador]);

  // Salvar quantidade de garantidores no localStorage
  useEffect(() => {
    if (qtdGarantidoresId !== null) {
      localStorage.setItem(QUANTIDADE_GARANTIDORES_STORAGE_KEY, JSON.stringify({ Id: qtdGarantidoresId, Name: qtdGarantidores }));
    }
  }, [qtdGarantidoresId, qtdGarantidores]);

  const limparErroEmprestimo = (campo: string) => {
    setErrosEmprestimo(prev => {
      const novo = { ...prev };
      delete novo[campo];
      return novo;
    });
  };

  const limparErroGarantia = (campo: string) => {
    setErrosGarantia(prev => {
      const novo = { ...prev };
      delete novo[campo];
      return novo;
    });
  };

  const limparErroGarantidores = (campo: string) => {
    setErrosGarantidores(prev => {
      const novosErros = { ...prev };
      delete novosErros[campo];
      return novosErros;
    });
  };



  const limparTodosOsDados = () => {
    // Limpar dados dos tomadores
    setQuantidade(null);
    setQuantidadeId(null);
    setTomadores(Array.from({ length: 4 }, () => ({ ...initialTomador })));
    setErros({});
    setMostrarErro(false);
    
    // Limpar dados do empréstimo
    setEmprestimo({ ...initialEmprestimo });
    setErrosEmprestimo({});
    setMostrarErroEmprestimo(false);
    
    // Limpar dados da garantia
    setGarantia({ ...initialGarantia });
    setErrosGarantia({});
    setMostrarErroGarantia(false);
    
    // Limpar dados dos garantidores
    setGarantidores([]);
    setQtdGarantidores(1);
    setQtdGarantidoresId(null);
    setErrosGarantidores({});
    setMostrarErroGarantidores(false);
    
    // Limpar email do parceiro responsável
    setEmailParceiroResponsavel('');
    setErroEmailParceiro('');
    
    // Limpar dados dos documentos
    setDocumentosIdentificacao([]);
    setDocumentosComprovanteEndereco([]);
    setDocumentosCertificadoCivil([]);
    setDocumentosHoleriteExtrato([]);
    
    // Limpar modais
    setShowGarantidorModal(false);
    setShowQtdGarantidores(false);
    setShowGarantidores(false);
    setShowSuccessModal(false);
    setSuccessData(null);
    setMostrarErroRendaMinima(false);
    setIsEnviando(false);
    setShowModalErroEnvio(false);
    setErroEnvio('');
    setShowModalLimparDados(false);
    
    // Limpar localStorage
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    localStorage.removeItem(TOMADORES_STORAGE_KEY);
    localStorage.removeItem(EMPRESTIMO_STORAGE_KEY);
    localStorage.removeItem(GARANTIA_STORAGE_KEY);
    localStorage.removeItem(GARANTIDORES_STORAGE_KEY);
    localStorage.removeItem(QUANTIDADE_GARANTIDORES_STORAGE_KEY);
    localStorage.removeItem(EMAIL_PARCEIRO_STORAGE_KEY);
    localStorage.removeItem('ploomes_documentos_identificacao');
    localStorage.removeItem('ploomes_documentos_comprovante_endereco');
    localStorage.removeItem('ploomes_documentos_certificado_civil');
    localStorage.removeItem('ploomes_documentos_holerite_extrato');
    
    // Voltar para a etapa inicial
    setEtapa(0);
    
  };

  // Funções para verificar se etapas estão completas
  const verificarEtapaTomadoresCompleta = () => {
    if (!quantidade || quantidade === 0) {
      return false;
    }
    
    for (let i = 0; i < quantidade; i++) {
      const tomador = tomadores[i];
      if (!tomador) {
        return false;
      }
      
      // Verificar se todos os campos obrigatórios estão preenchidos
      const isAutonomo = tomador.qualificacaoProfissional?.Name?.toLowerCase() === 'autônomo(a)';
      const isEmpresario = tomador.qualificacaoProfissional?.Name?.toLowerCase() === 'empresário(a)';
      const isPessoaJuridica = tomador.tipoPessoa?.Name?.toLowerCase() === 'pessoa jurídica';
      
      // Debug: verificar se o tomador está definido corretamente
      if (!tomador || typeof tomador !== 'object') {
        return false;
      }
      
      // Campos básicos obrigatórios para todos
      if (!validarCampoVazio(tomador.nome)) {
        return false;
      }
      if (!validarMinimoCaracteres(tomador.nome)) {
        return false;
      }
      if (!validarCampoObjeto(tomador.tipoPessoa)) {
        return false;
      }
      
      // Campos específicos por tipo de pessoa
      if (isPessoaJuridica) {
        // Para PJ: validar campos específicos de PJ
        if (!validarCampoVazio(tomador.cnpj)) {
          return false;
        }
        if (!validarCampoVazio(tomador.ramoPJ)) {
          return false;
        }
        if (!validarMinimoCaracteres(tomador.ramoPJ)) {
          return false;
        }
        if (!validarCampoObjeto(tomador.quantidadeSociosPJ)) {
          return false;
        }
        if (!validarCampoObjeto(tomador.numeroAdmin)) {
          return false;
        }
      } else {
        // Para PF: validar campos obrigatórios
        // Email e telefone são obrigatórios apenas para pessoa física
        if (!validarCampoVazio(tomador.email)) {
          return false;
        }
        if (!validarCampoVazio(tomador.telefone)) {
          return false;
        }
        
        // Estado civil, data nascimento, profissão, qualificação profissional
        if (!validarCampoObjeto(tomador.estadoCivil)) {
          return false;
        }
        if (!validarCampoVazio(tomador.dataNascimento)) {
          return false;
        }
        if (!validarDataNascimento(tomador.dataNascimento)) {
          return false;
        }
        if (!validarCampoVazio(tomador.profissao)) {
          return false;
        }
        if (!validarMinimoCaracteres(tomador.profissao)) {
          return false;
        }
        if (!validarCampoObjeto(tomador.qualificacaoProfissional)) {
          return false;
        }
        
        // CPF é obrigatório para pessoa física
        if (!validarCampoVazio(tomador.cpf)) {
          return false;
        }
        
        // Validação das perguntas sobre PJ vinculada - obrigatórias apenas para o primeiro tomador
        // Para obter o valor de possuiPJVinculada para validação (pode ser undefined para tomadores > 1)
        const possuiPJVinculadaName = tomador.possuiPJVinculada?.Name?.trim();
        
        if (i === 0) {
          if (!validarCampoObjeto(tomador.possuiPJVinculada)) {
            return false;
          }
          
          // Se possui PJ vinculada, a segunda pergunta também é obrigatória (apenas para o primeiro tomador)
          if (possuiPJVinculadaName === 'Sim' && !validarCampoObjeto(tomador.pjComporRenda)) {
            return false;
          }
        }
        
        // Validação dos campos de PJ vinculada - apenas para o primeiro tomador
        if (i === 0 && possuiPJVinculadaName === 'Sim') {
          // Validar quantidade de PJs
          if (!tomador.quantidadePJ || parseInt(tomador.quantidadePJ, 10) <= 0) {
            return false;
          } else {
            const quantidade = parseInt(tomador.quantidadePJ, 10);
            if (quantidade > 10) {
              return false;
            } else {
              // Validar cada PJ vinculada
              const pjsVinculadas = tomador.pjsVinculadas || [];
              for (let j = 0; j < quantidade; j++) {
                const pj = pjsVinculadas[j] || { nome: '', cnpj: '' };
                
                // Validar nome
                if (!validarCampoVazio(pj.nome)) {
                  return false;
                }
                
                // Validar CNPJ
                if (!validarCampoVazio(pj.cnpj)) {
                  return false;
                }
              }
            }
          }
        }
        
        // Validação adicional para Empresário(a) (Pessoa Física)
        if (isEmpresario) {
          if (!validarCampoVazio(tomador.cnpj)) {
            return false;
          }
          if (!validarCampoVazio(tomador.ramoPJ)) {
            return false;
          }
          if (!validarMinimoCaracteres(tomador.ramoPJ)) {
            return false;
          }
        }
      }
      
      // Comprovação de renda informal é obrigatória para todos
      if (!validarCampoObjeto(tomador.comprovacaoRendaInformal)) {
        return false;
      }
      
      // Renda formal é obrigatória apenas para pessoa física que não seja empresário nem autônomo
      if (!isPessoaJuridica && !isEmpresario && !isAutonomo && !validarCampoObjeto(tomador.comprovacaoRendaFormal)) {
        return false;
      }
      
      // Verificar rendas baseadas na comprovação
      const rendaFormalNaoSeAplica = tomador.comprovacaoRendaFormal?.Name?.toLowerCase() === 'não se aplica';
      const rendaInformalNaoSeAplica = tomador.comprovacaoRendaInformal?.Name?.toLowerCase() === 'não se aplica';
    
      // Renda formal é obrigatória apenas para pessoa física que não seja empresário nem autônomo
      if (!isPessoaJuridica && !isEmpresario && !isAutonomo && !rendaFormalNaoSeAplica && !validarCampoMonetarioMaiorQueZero(tomador.rendaFormal)) {
        return false;
      }
      
      if (!rendaInformalNaoSeAplica && !validarCampoMonetarioMaiorQueZero(tomador.rendaInformal)) {
        return false;
      }
      
      // Verificar se a renda total é maior que zero
      // Para autônomos, empresários e pessoa jurídica, considera apenas renda informal
      // Para outros casos, considera renda formal + informal
      const ambosNaoSeAplicam = (isPessoaJuridica || isEmpresario || isAutonomo) 
        ? rendaInformalNaoSeAplica 
        : (rendaFormalNaoSeAplica && rendaInformalNaoSeAplica);
      if (!ambosNaoSeAplicam && !validarCampoMonetarioMaiorQueZero(tomador.rendaTotalInformada)) {
        return false;
      }
    }

    // Se chegou até aqui, todos os campos obrigatórios estão preenchidos
    return true;
  };

  const verificarEtapaEmprestimoCompleta = () => {
    if (!validarCampoObjeto(emprestimo.amortizacao) || !validarCampoObjeto(emprestimo.carencia) || 
        !validarValorSolicitado(emprestimo.valorSolicitado) || !validarCampoMonetario(emprestimo.rendaTotal) || 
        !validarPrazoSolicitado(emprestimo.prazoSolicitado) || !validarJurosSolicitado(emprestimo.jurosSolicitado) || 
        !validarCampoVazio(emprestimo.comentarios) || 
        !validarCampoObjeto(emprestimo.motivoEmprestimo)) {
      return false;
    }
    return true;
  };

  const verificarEtapaGarantiaCompleta = () => {
    if (!validarCampoObjeto(garantia.garantiaPertenceTomador) || !validarValorGarantia(garantia.valorGarantia) || 
        !validarCampoObjeto(garantia.ruralUrbano) || 
        !validarCampoVazio(garantia.enderecoGarantia) || !validarCampoVazio(garantia.numeroGarantia) ||
        !validarCampoVazio(garantia.cepGarantia) ||
        !validarCampoObjeto(garantia.utilizacaoGarantia) || !validarCampoObjeto(garantia.tipoGarantia) ||
        garantia.situacaoGarantia === undefined) {
      return false;
    }
    
    // Se garantia não está quitada, verificar campos de financiamento
    if (garantia.situacaoGarantia === false) {
      if (!validarCampoObjeto(garantia.comQuemEstaFinanciada) || !validarCampoVazio(garantia.valorEmAberto)) {
        return false;
      }
    }
    
    // Verificar campos de documentação
    if (garantia.escritura === undefined || garantia.nomeMatrícula === undefined || 
        garantia.imovelAverbado === undefined || garantia.possuiUsufruto === undefined || 
        garantia.processoInventario === undefined) {
      return false;
    }
    
    // Verificar campos de dívidas baseado no tipo (rural/urbano)
    if (garantia.ruralUrbano?.Name === 'Urbano') {
      if (garantia.dividaCondominio === undefined || garantia.dividaIPTU === undefined) {
        return false;
      }
    } else if (garantia.ruralUrbano?.Name === 'Rural') {
      if (!validarCampoObjeto(garantia.dividaITR)) {
        return false;
      }
    }
    
    // Verificar se valor solicitado não excede 50% do valor do imóvel
    if (garantia.valorGarantia && garantia.tipoGarantia) {
      const valorImovelNumerico = parseFloat(garantia.valorGarantia.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
      const valorSolicitadoNumerico = parseFloat(emprestimo.valorSolicitado?.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
      
      // Verificar valor mínimo do imóvel (R$ 150.000)
      if (valorImovelNumerico < 150000) {
        return false; // Valor do imóvel menor que R$ 150.000
      }
      
      // Aplicar regra de 50% do valor do imóvel
      const valorMaximoPermitido = valorImovelNumerico * 0.50;
      
      if (valorSolicitadoNumerico > valorMaximoPermitido && valorMaximoPermitido > 0) {
        return false; // Valor solicitado excede 50% do valor do imóvel
      }
    }
    
    return true;
  };

  const verificarEtapaGarantidoresCompleta = () => {
    if (!qtdGarantidores || qtdGarantidores === 0) {
      return false;
    }
    
    for (let i = 0; i < qtdGarantidores; i++) {
      const garantidor = garantidores[i];
      if (!garantidor) {
        return false;
      }
      
      const isPessoaJuridica = garantidor.tipoPessoa?.Name?.toLowerCase() === 'pessoa jurídica';
      
      // Campos sempre obrigatórios
      if (!validarCampoObjeto(garantidor.tipoPessoa)) {
        return false;
      }
      if (!validarCampoVazio(garantidor.nome)) {
        return false;
      }
      if (!validarMinimoCaracteres(garantidor.nome)) {
        return false;
      }
      if (!validarCampoVazio(garantidor.email)) {
        return false;
      }
      
      // Estado civil é obrigatório apenas para pessoa física
      if (!isPessoaJuridica && !validarCampoObjeto(garantidor.estadoCivil)) {
        return false;
      }
      
      // Validação condicional baseada no tipo de pessoa
      if (garantidor.tipoPessoa?.Name?.toLowerCase() === 'pessoa física') {
        // Para pessoa física: validar campos específicos baseados em "tem empresa"
        if (!validarCampoObjeto(garantidor.temEmpresa)) {
          return false;
        }
        
        if (garantidor.temEmpresa?.Name?.toLowerCase() === 'sim') {
          // Quando tem empresa: CNPJ é obrigatório
          if (!validarCampoVazio(garantidor.cnpj)) {
            return false;
          }
        } else if (garantidor.temEmpresa?.Name?.toLowerCase() === 'não') {
          // Quando não tem empresa: CPF e profissão são obrigatórios
          if (!validarCampoVazio(garantidor.cpf)) {
            return false;
          }
          if (!validarCampoVazio(garantidor.profissao)) {
            return false;
          }
        }
      } else if (garantidor.tipoPessoa?.Name?.toLowerCase() === 'pessoa jurídica') {

        // Para pessoa jurídica: CNPJ e Razão Social são obrigatórios
        if (!validarCampoVazio(garantidor.cnpj)) {
          return false;
        }

        if (!validarCampoVazio(garantidor.nome)) {
          return false;
        }
        if (!validarMinimoCaracteres(garantidor.nome)) {
          return false;
        }
      }
    }
    
    return true;
  };

  // Função para obter texto dinâmico baseado na etapa atual
  const obterTextoDinamico = () => {
    // Etapa de seleção de quantidade
    if (etapa === 0) {
      return {
        titulo: "O que é um Tomador?",
        descricao: "Pessoa física ou jurídica que solicita o crédito, com dados pessoais, endereço e informações financeiras para análise."
      };
    }
    
    // Etapa de tomadores
    if (etapa > 0 && etapa <= (quantidade || 0)) {
      return {
        titulo: "O que é um Tomador?",
        descricao: "Pessoa física ou jurídica que solicita o crédito, com dados pessoais, endereço e informações financeiras para análise."
      };
    }
    
    // Etapa de empréstimo
    if (etapa === (quantidade || 0) + 1) {
      return {
        titulo: "O que é um Empréstimo?",
        descricao: "Operação financeira onde uma instituição empresta dinheiro ao tomador, que deve devolver com juros em um prazo determinado."
      };
    }
    
    // Etapa de garantia
    if (etapa === (quantidade || 0) + 2) {
      return {
        titulo: "O que é uma Garantia?",
        descricao: "Bem (geralmente um imóvel) oferecido como segurança para o empréstimo, que pode ser executado em caso de inadimplência."
      };
    }
    
    // Etapa de garantidores
    if (showGarantidores && (etapa === (quantidade || 0) + 3 || etapa >= (quantidade || 0) + 4)) {
      return {
        titulo: "O que é um Garantidor?",
        descricao: "Pessoa que se compromete a pagar o empréstimo caso o tomador não consiga honrar com suas obrigações."
      };
    }
    
    return {
      titulo: "O que é um Tomador?",
      descricao: "Pessoa física ou jurídica que solicita o crédito, com dados pessoais, endereço e informações financeiras para análise."
    };
  };

  const validarTomador = (tomador: any, idx: number): { valido: boolean; erros: { [key: string]: string } } => {
    const erros: { [key: string]: string } = {};
    const isPessoaJuridica = tomador.tipoPessoa?.Name?.toLowerCase() === 'pessoa jurídica';
    
    // Validação de campos obrigatórios
    if (!validarCampoVazio(tomador.nome)) {
      erros.nome = 'Nome é obrigatório';
    } else if (!validarMinimoCaracteres(tomador.nome)) {
      erros.nome = 'Nome deve ter pelo menos 3 caracteres';
    }
    
    // Email e telefone - apenas para pessoa física
    if (!isPessoaJuridica) {
      if (!validarCampoVazio(tomador.email)) {
        erros.email = 'Email é obrigatório';
      } else if (!validarEmail(tomador.email)) {
        erros.email = 'Email inválido';
      }
      
      if (!validarCampoVazio(tomador.telefone)) {
        erros.telefone = 'Telefone é obrigatório';
      } else if (!validarTelefone(tomador.telefone)) {
        erros.telefone = 'Telefone inválido';
      }
    }
    
    if (!validarCampoVazio(tomador.dataNascimento)) {
      erros.dataNascimento = 'Data de nascimento é obrigatória';
    } else if (!validarDataNascimento(tomador.dataNascimento)) {
      erros.dataNascimento = 'Idade deve estar entre 18 e 80 anos';
    }
    
    if (!validarCampoObjeto(tomador.tipoPessoa)) {
      erros.tipoPessoa = 'Tipo de pessoa é obrigatório';
    }
    
    // Validação de documento baseada no tipo de pessoa
    if (tomador.tipoPessoa?.Name?.toLowerCase() === 'pessoa física') {
      if (!validarCampoVazio(tomador.cpf)) {
        erros.cpf = 'CPF é obrigatório';
      } else if (!validarCPF(tomador.cpf)) {
        erros.cpf = 'CPF inválido';
      }
      
      // Validação adicional para Empresário(a) (Pessoa Física)
      if (tomador.qualificacaoProfissional?.Name?.toLowerCase() === 'empresário(a)') {
        if (!validarCampoVazio(tomador.cnpj)) {
          erros.cnpj = 'CNPJ é obrigatório para empresário(a)';
        } else if (!validarCNPJ(tomador.cnpj)) {
          erros.cnpj = 'CNPJ inválido';
        }
        
        if (!validarCampoVazio(tomador.ramoPJ)) {
          erros.ramoPJ = 'Ramo da empresa é obrigatório para empresário(a)';
        } else if (!validarMinimoCaracteres(tomador.ramoPJ)) {
          erros.ramoPJ = 'Ramo da empresa deve ter pelo menos 3 caracteres';
        }
      }
    } else if (tomador.tipoPessoa?.Name?.toLowerCase() === 'pessoa jurídica') {
      if (!validarCampoVazio(tomador.cnpj)) {
        erros.cnpj = 'CNPJ é obrigatório';
      } else if (!validarCNPJ(tomador.cnpj)) {
        erros.cnpj = 'CNPJ inválido';
      }
    }
    
    // Estado civil - apenas para pessoa física
    if (!isPessoaJuridica && !validarCampoObjeto(tomador.estadoCivil)) {
      erros.estadoCivil = 'Estado civil é obrigatório';
    }
    
    // Qualificação profissional e profissão - apenas para pessoa física
    if (!isPessoaJuridica) {
      if (!validarCampoObjeto(tomador.qualificacaoProfissional)) {
        erros.qualificacaoProfissional = 'Qualificação profissional é obrigatória';
      }
      
      if (!validarCampoVazio(tomador.profissao)) {
        erros.profissao = 'Profissão é obrigatória';
      } else if (!validarMinimoCaracteres(tomador.profissao)) {
        erros.profissao = 'Profissão deve ter pelo menos 3 caracteres';
      }
      
      // Validação das perguntas sobre PJ vinculada - obrigatórias apenas para o primeiro tomador
      if (idx === 0) {
        if (!validarCampoObjeto(tomador.possuiPJVinculada)) {
          erros.possuiPJVinculada = 'É obrigatório informar se possui PJ vinculada';
        }
        
        // Se possui PJ vinculada, a segunda pergunta também é obrigatória (apenas para o primeiro tomador)
        if (tomador.possuiPJVinculada?.Name === 'Sim' && !validarCampoObjeto(tomador.pjComporRenda)) {
          erros.pjComporRenda = 'É obrigatório informar se a PJ irá compor renda';
        }
      }
      
      // Validação dos campos de PJ vinculada - apenas para o primeiro tomador
      if (idx === 0 && tomador.possuiPJVinculada?.Name === 'Sim') {
        // Validar quantidade de PJs
        if (!tomador.quantidadePJ || parseInt(tomador.quantidadePJ, 10) <= 0) {
          erros.quantidadePJ = 'É obrigatório informar a quantidade de PJs vinculadas';
        } else {
          const quantidade = parseInt(tomador.quantidadePJ, 10);
          if (quantidade > 10) {
            erros.quantidadePJ = 'O máximo permitido é 10 PJs';
          } else {
            // Validar cada PJ vinculada
            const pjsVinculadas = tomador.pjsVinculadas || [];
            for (let i = 0; i < quantidade; i++) {
              const pj = pjsVinculadas[i] || { nome: '', cnpj: '' };
              
              // Validar nome
              if (!validarCampoVazio(pj.nome)) {
                erros[`pjVinculada_nome_${i}`] = `Nome da PJ ${i + 1} é obrigatório`;
              } else if (!validarMinimoCaracteres(pj.nome, 3)) {
                erros[`pjVinculada_nome_${i}`] = `Nome da PJ ${i + 1} deve ter pelo menos 3 caracteres`;
              }
              
              // Validar CNPJ
              if (!validarCampoVazio(pj.cnpj)) {
                erros[`pjVinculada_cnpj_${i}`] = `CNPJ da PJ ${i + 1} é obrigatório`;
              } else {
                const cnpjLimpo = pj.cnpj.replace(/\D/g, '');
                if (cnpjLimpo.length !== 14) {
                  erros[`pjVinculada_cnpj_${i}`] = `CNPJ da PJ ${i + 1} deve ter 14 dígitos`;
                } else if (!validarCNPJ(cnpjLimpo)) {
                  erros[`pjVinculada_cnpj_${i}`] = `CNPJ da PJ ${i + 1} é inválido`;
                }
              }
            }
          }
        }
      }
    }
    
    // Validação de documentos obrigatórios (temporariamente desabilitada para evitar erros)
    // if (!documentosIdentificacao[idx]?.file) {
    //   erros.documentoIdentificacao = 'Documento de identificação é obrigatório';
    // }
    
    // if (!documentosComprovanteEndereco[idx]?.file) {
    //   erros.documentoComprovanteEndereco = 'Documento de comprovante de endereço é obrigatório';
    // }
    
    // Validação de comprovação de renda formal - apenas para pessoa física, exceto empresário(a) e autônomo(a)
    const isEmpresario = tomador.qualificacaoProfissional?.Name?.toLowerCase() === 'empresário(a)';
    const isAutonomo = tomador.qualificacaoProfissional?.Name?.toLowerCase() === 'autônomo(a)';
    if (!isPessoaJuridica && !isEmpresario && !isAutonomo && !validarCampoObjeto(tomador.comprovacaoRendaFormal)) {
      erros.comprovacaoRendaFormal = 'Comprovação de renda formal é obrigatória';
    }
    
    // Validação de comprovação de renda informal
    if (!validarCampoObjeto(tomador.comprovacaoRendaInformal)) {
      erros.comprovacaoRendaInformal = 'Comprovação de renda informal é obrigatória';
    }
    
    // Validação de rendas baseada na comprovação
    const rendaFormalNaoSeAplica = tomador.comprovacaoRendaFormal?.Name?.toLowerCase() === 'não se aplica';
    const rendaInformalNaoSeAplica = tomador.comprovacaoRendaInformal?.Name?.toLowerCase() === 'não se aplica';
    
    // Renda formal - apenas para pessoa física, exceto empresário e autônomo
    if (!isPessoaJuridica && !isEmpresario && !isAutonomo && !rendaFormalNaoSeAplica) {
      if (!validarCampoVazio(tomador.rendaFormal)) {
        erros.rendaFormal = 'Renda formal é obrigatória';
      } else if (!validarCampoMonetarioMaiorQueZero(tomador.rendaFormal)) {
        erros.rendaFormal = 'Renda formal deve ser maior que zero';
      }
    }
    
    if (!rendaInformalNaoSeAplica) {
      if (!validarCampoVazio(tomador.rendaInformal)) {
        erros.rendaInformal = 'Renda informal é obrigatória';
      } else if (!validarCampoMonetarioMaiorQueZero(tomador.rendaInformal)) {
        erros.rendaInformal = 'Renda informal deve ser maior que zero';
      }
    }
    
    // Renda total é sempre obrigatória (será calculada automaticamente)
    // Para pessoa jurídica, empresário ou autônomo, considera apenas renda informal
    // Para pessoa física (exceto empresário e autônomo), considera renda formal + informal
    const ambosNaoSeAplicam = (isPessoaJuridica || isEmpresario || isAutonomo) 
      ? rendaInformalNaoSeAplica 
      : (rendaFormalNaoSeAplica && rendaInformalNaoSeAplica);
    if (!validarCampoVazio(tomador.rendaTotalInformada)) {
      erros.rendaTotalInformada = 'Renda total informada é obrigatória';
    } else if (!ambosNaoSeAplicam && !validarCampoMonetarioMaiorQueZero(tomador.rendaTotalInformada)) {
      erros.rendaTotalInformada = 'Renda total deve ser maior que zero';
    }
    
    // Validações específicas para pessoa jurídica
    if (tomador.tipoPessoa?.Name?.toLowerCase() === 'pessoa jurídica') {
      if (!validarCampoObjeto(tomador.quantidadeSociosPJ)) {
        erros.quantidadeSociosPJ = 'Quantidade de sócios é obrigatória';
      }
      
      if (!validarCampoObjeto(tomador.numeroAdmin)) {
        erros.numeroAdmin = 'Número de administradores é obrigatório';
      }
      
      if (!validarCampoVazio(tomador.ramoPJ)) {
        erros.ramoPJ = 'Ramo da PJ é obrigatório';
      } else if (!validarMinimoCaracteres(tomador.ramoPJ)) {
        erros.ramoPJ = 'Ramo da PJ deve ter pelo menos 3 caracteres';
      }
    }
    
    return {
      valido: Object.keys(erros).length === 0,
      erros
    };
  };

  const validarEmprestimo = (emp: any): { valido: boolean; erros: { [key: string]: string } } => {
    const erros: { [key: string]: string } = {};
    if (!validarCampoObjeto(emp.amortizacao)) {
      erros.amortizacao = 'Amortização é obrigatória';
    }
    if (!validarCampoObjeto(emp.carencia)) {
      erros.carencia = 'Carência é obrigatória';
    }
    if (!validarCampoObjeto(emp.motivoEmprestimo)) {
      erros.motivoEmprestimo = 'Motivo do Empréstimo é obrigatório';
    }
    if (!validarCampoVazio(emp.valorSolicitado)) {
      erros.valorSolicitado = 'Valor solicitado é obrigatório';
    } else if (!validarValorSolicitado(emp.valorSolicitado)) {
      erros.valorSolicitado = 'Valor solicitado deve estar entre R$ 75.000,00 e R$ 5.000.000,00';
    }
    // Renda total é calculada automaticamente, não precisa validar
    if (!validarCampoVazio(emp.prazoSolicitado)) {
      erros.prazoSolicitado = 'Prazo solicitado é obrigatório';
    } else if (!validarPrazoSolicitado(emp.prazoSolicitado)) {
      erros.prazoSolicitado = 'Prazo solicitado deve ser 1 mês ou entre 36 e 240 meses';
    }
    if (!validarCampoVazio(emp.jurosSolicitado)) {
      erros.jurosSolicitado = 'Juros solicitado é obrigatório';
    } else if (!validarJurosSolicitado(emp.jurosSolicitado)) {
      erros.jurosSolicitado = 'Juros solicitado deve estar entre 1,19% e 2,00%';
    }
    if (!validarCampoVazio(emp.comentarios)) {
      erros.comentarios = 'Defesa do crédito é obrigatória';
    } else if (!validarMinimoCaracteres(emp.comentarios, 50)) {
      erros.comentarios = 'A defesa do crédito deve ter pelo menos 50 caracteres';
    }
    return { valido: Object.keys(erros).length === 0, erros };
  };

  const validarGarantia = (gar: any): { valido: boolean; erros: { [key: string]: string } } => {
    const erros: { [key: string]: string } = {};

    // Validações básicas
    if (!validarCampoObjeto(gar.garantiaPertenceTomador)) {
      erros.garantiaPertenceTomador = 'Informe se a garantia pertence ao tomador';
    }
    if (!validarCampoVazio(gar.valorGarantia)) {
      erros.valorGarantia = 'Valor da garantia é obrigatório';
    } else if (!validarValorGarantia(gar.valorGarantia)) {
      erros.valorGarantia = 'Valor da garantia deve estar entre R$ 250.000,00 e R$ 50.000.000,00';
    }
    // Removida validação de cidadeGarantia - preenchida automaticamente pelo CEP
    if (!validarCampoObjeto(gar.ruralUrbano)) {
      erros.ruralUrbano = 'Selecione se é Rural ou Urbano';
    }
    if (!validarCampoVazio(gar.enderecoGarantia)) {
      erros.enderecoGarantia = 'Endereço da garantia é obrigatório';
    }
    if (!validarCampoVazio(gar.numeroGarantia)) {
      erros.numeroGarantia = 'Número da garantia é obrigatório';
    }
    if (!validarCampoVazio(gar.cepGarantia)) {
      erros.cepGarantia = 'CEP da garantia é obrigatório';
    }
    // Removida validação de unidadeFederativa - preenchida automaticamente pelo CEP
    if (!validarCampoObjeto(gar.utilizacaoGarantia)) {
      erros.utilizacaoGarantia = 'Qual a utilização da garantia é obrigatória';
    }
    if (!validarCampoObjeto(gar.tipoGarantia)) {
      erros.tipoGarantia = 'Tipo da garantia é obrigatório';
    }

    // Validação condicional para situação da garantia
    if (gar.situacaoGarantia === undefined) {
      erros.situacaoGarantia = 'Informe se a garantia está quitada';
    }

    // Validações condicionais para financiamento (quando garantia não está quitada)
    if (gar.situacaoGarantia === false) {
      if (!validarCampoObjeto(gar.comQuemEstaFinanciada)) {
        erros.comQuemEstaFinanciada = 'Informe com quem a garantia está financiada';
      }
      if (!validarCampoVazio(gar.valorEmAberto)) {
        erros.valorEmAberto = 'Valor em aberto da garantia é obrigatório';
      }
      // if (!validarCampoVazio(gar.quantasParcelasFalta)) {
      //   erros.quantasParcelasFalta = 'Quantidade de parcelas em aberto é obrigatória';
      // }
    }

    // Validações para campos booleanos
    if (gar.escritura === undefined) {
      erros.escritura = 'Informe se há escritura individual';
    }
    if (gar.nomeMatrícula === undefined) {
      erros.nomeMatrícula = 'Informe se o nome está na matrícula';
    }
    if (gar.processoInventario === undefined) {
      erros.processoInventario = 'Informe se há processo de inventário';
    }
    if (gar.imovelAverbado === undefined) {
      erros.imovelAverbado = 'Informe se o imóvel está averbado';
    }
    if (gar.possuiUsufruto === undefined) {
      erros.possuiUsufruto = 'Informe se o imóvel possui usufruto';
    }

    // Validações condicionais para dívidas baseadas no tipo do imóvel
    if (gar.ruralUrbano?.Name === 'Urbano') {
      if (gar.dividaCondominio === undefined) {
        erros.dividaCondominio = 'Informe se há dívida de condomínio';
      }
      if (gar.dividaIPTU === undefined) {
        erros.dividaIPTU = 'Informe se há dívida de IPTU';
      }
    } else if (gar.ruralUrbano?.Name === 'Rural') {
      if (!validarCampoObjeto(gar.dividaITR)) {
        erros.dividaITR = 'Informe se há dívida de ITR';
      }
    }

    return { valido: Object.keys(erros).length === 0, erros };
  };

  const validarGarantidor = (garantidor: any): { valido: boolean; erros: { [key: string]: string } } => {
    const erros: { [key: string]: string } = {};
    const isPessoaJuridica = garantidor.tipoPessoa?.Name?.toLowerCase() === 'pessoa jurídica';

    // Campos sempre obrigatórios
    if (!isPessoaJuridica) {
      console.log(`  - Estado Civil: valor="${garantidor.estadoCivil?.Name || '(vazio)'}" | Id=${garantidor.estadoCivil?.Id} | válido=${validarCampoObjeto(garantidor.estadoCivil)}`);
    }
    
    if (!validarCampoObjeto(garantidor.tipoPessoa)) {
      erros.tipoPessoa = 'Tipo de pessoa é obrigatório';
    }
    
    if (!isPessoaJuridica && !validarCampoObjeto(garantidor.estadoCivil)) {
      erros.estadoCivil = 'Estado civil é obrigatório';
    }
    
    if (!validarCampoVazio(garantidor.nome)) {
      erros.nome = 'Nome é obrigatório';
    } else if (!validarMinimoCaracteres(garantidor.nome)) {
      erros.nome = 'Nome deve ter pelo menos 3 caracteres';
    }
    
    if (!validarCampoVazio(garantidor.email)) {
      erros.email = 'Email é obrigatório';
    } else if (!validarEmail(garantidor.email)) {
      erros.email = 'Email inválido';
    }

    // Validação condicional baseada no tipo de pessoa
    if (garantidor.tipoPessoa?.Name?.toLowerCase() === 'pessoa física') {
      // Para pessoa física: validar campos específicos baseados em "tem empresa"
      if (!validarCampoObjeto(garantidor.temEmpresa)) {
        erros.temEmpresa = 'Informação sobre empresa é obrigatória';
      }

      if (!validarCampoVazio(garantidor.cpf)) {
        erros.cpf = 'CPF é obrigatório quando não tem empresa';
      }
      
      if (garantidor.temEmpresa?.Name?.toLowerCase() === 'sim') {
        // Quando tem empresa: CNPJ é obrigatório
        if (!validarCampoVazio(garantidor.cnpj)) {
          erros.cnpj = 'CNPJ é obrigatório quando tem empresa';
        }

        if (!validarCampoVazio(garantidor.profissao)) {
          erros.profissao = 'Razão social é obrigatória';
        }

        
      } else if (garantidor.temEmpresa?.Name?.toLowerCase() === 'não') {

        // Quando não tem empresa: CPF e profissão são obrigatórios
        if (!validarCampoVazio(garantidor.cpf)) {
          erros.cpf = 'CPF é obrigatório quando não tem empresa';
        }
        
        if (!validarCampoVazio(garantidor.profissao)) {
          erros.profissao = 'Profissão é obrigatória quando não tem empresa';
        }

      }

    } else if (garantidor.tipoPessoa?.Name?.toLowerCase() === 'pessoa jurídica') {
      // Para pessoa jurídica: CNPJ e Razão Social são obrigatórios
      if (!validarCampoVazio(garantidor.cnpj)) {
        erros.cnpj = 'CNPJ é obrigatório';
      } else if (!validarCNPJ(garantidor.cnpj)) {
        erros.cnpj = 'CNPJ inválido';
      }
    }

    const valido = Object.keys(erros).length === 0;

    return {
      valido,
      erros
    };
  };

  // Função para validar grau de parentesco
  const validarGrauParentesco = (garantidor: any): { valido: boolean; erros: { [key: string]: string } } => {
    const erros: { [key: string]: string } = {};

    if (!validarCampoObjeto(garantidor.grauParentesco)) {
      erros.grauParentesco = 'Grau de parentesco é obrigatório';
    }

    return {
      valido: Object.keys(erros).length === 0,
      erros
    };
  };

  // Função para limpar documentos duplicados do IndexedDB
  const limparDocumentosDuplicados = async () => {
    try {
      const metadataList = await indexedDBManager.getAllMetadataByType('holerite_extrato');
      
      // Agrupar por tomadorIndex + campoId
      const grupos = new Map();
      
      metadataList.forEach(metadata => {
        const chave = `${metadata.tomadorIndex}_${metadata.campoId}`;
        if (!grupos.has(chave)) {
          grupos.set(chave, []);
        }
        grupos.get(chave).push(metadata);
      });
      
      // Para cada grupo, manter apenas o mais recente
      for (const [chave, documentos] of grupos) {
        if (documentos.length > 1) {
          // Ordenar por createdAt (mais recente primeiro)
          documentos.sort((a, b) => b.createdAt - a.createdAt);
          
          // Remover documentos antigos
          for (let i = 1; i < documentos.length; i++) {
            await indexedDBManager.removeDocument(documentos[i].id);
          }
        }
      }
    } catch (error) {
    }
  };

  const handleDebug = async () => {
    // Limpar documentos duplicados primeiro
    await limparDocumentosDuplicados();
    
    // Mostrar dados do IndexedDB
    try {
      // Listar todos os metadados por tipo
      const tiposDocumentos = ['identificacao', 'comprovante', 'certificado', 'holerite_extrato'];
      
      for (const tipo of tiposDocumentos) {
        const metadataList = await indexedDBManager.getAllMetadataByType(tipo);
        
        // Para cada documento, mostrar se tem arquivo completo
        for (const metadata of metadataList) {
          const documentoCompleto = await indexedDBManager.getDocument(metadata.id);
        }
      }
    } catch (error) {
    }
    
    try {
      const savedQtd = localStorage.getItem(LOCAL_STORAGE_KEY);
      const savedTomadores = localStorage.getItem(TOMADORES_STORAGE_KEY);
      const savedGarantia = localStorage.getItem(GARANTIA_STORAGE_KEY);
      const savedEmprestimo = localStorage.getItem(EMPRESTIMO_STORAGE_KEY);
      const savedGarantidores = localStorage.getItem(GARANTIDORES_STORAGE_KEY);
      
      
      let qtd = 0;
      if (savedQtd) {
        try {
          const parsed = JSON.parse(savedQtd);
          qtd = parsed.Name ? Number(parsed.Name) : 0;
        } catch (error) {
        }
      }
      
      if (savedTomadores) {
        try {
          const parsed = JSON.parse(savedTomadores);
          
          if (savedEmprestimo) {
            const parsedEmprestimo = JSON.parse(savedEmprestimo);
          }
          
          if (savedGarantia) {
            const parsedGarantia = JSON.parse(savedGarantia);
          }
          
          if (savedGarantidores) {
            const parsedGarantidores = JSON.parse(savedGarantidores);
          }
        } catch (err) {
        }
      } else {
      }

      // Informações sobre o cache do Ploomes
      try {
        const cacheInfo = getCacheInfo();
      } catch (error) {
      }
      
      // Mostrar todas as chaves do cache
      try {
        const keys = Object.keys(localStorage);
        const ploomesKeys = keys.filter(key => key.startsWith('ploomes_options_'));
        
        ploomesKeys.forEach(key => {
          try {
            const cached = localStorage.getItem(key);
            if (cached) {
              const parsed = JSON.parse(cached);
              const age = Date.now() - parsed.timestamp;
              const ageHours = Math.floor(age / (1000 * 60 * 60));
            }
          } catch (error) {
          }
        });
      } catch (error) {
      }
      
      // Estado atual do componente
      
    } catch (error) {
    }
    
  };

  const renderBanner = () => {
    const etapasSidebar = showGarantidores
      ? [...etapas, 'Garantidores']
      : etapas;

    return (
      <div className="w-full flex justify-center py-6">
        <div className="max-w-7xl w-full rounded-3xl shadow-2xl p-8 bg-white border-2 border-gray-200">
          {/* Header com logo e botão */}

          {/* Indicador de progresso geral */}
          <div className="w-full mb-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-lg font-bold text-gray-800">Progresso Geral</span>
              <span className="text-lg font-bold text-blue-600">
                {(() => {
                  let etapasCompletadas = 0;
                  if (verificarEtapaTomadoresCompleta()) etapasCompletadas++;
                  if (verificarEtapaEmprestimoCompleta()) etapasCompletadas++;
                  if (verificarEtapaGarantiaCompleta()) etapasCompletadas++;
                  if (garantia.garantiaPertenceTomador?.Name === 'Imóvel de terceiro' && verificarEtapaGarantidoresCompleta()) etapasCompletadas++;
                  const totalEtapas = garantia.garantiaPertenceTomador?.Name === 'Imóvel de terceiro' ? 4 : 3;
                  return `${etapasCompletadas}/${totalEtapas} etapas`;
                })()}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 shadow-inner">
              <div 
                className="bg-gradient-to-r from-blue-500 to-green-500 h-4 rounded-full transition-all duration-500 shadow-md"
                style={{
                  width: `${(() => {
                    let etapasCompletadas = 0;
                    if (verificarEtapaTomadoresCompleta()) etapasCompletadas++;
                    if (verificarEtapaEmprestimoCompleta()) etapasCompletadas++;
                    if (verificarEtapaGarantiaCompleta()) etapasCompletadas++;
                    if (garantia.garantiaPertenceTomador?.Name === 'Imóvel de terceiro' && verificarEtapaGarantidoresCompleta()) etapasCompletadas++;
                    const totalEtapas = garantia.garantiaPertenceTomador?.Name === 'Imóvel de terceiro' ? 4 : 3;
                    return (etapasCompletadas / totalEtapas) * 100;
                  })()}%`
                }}
              ></div>
            </div>
          </div>

          {/* Barra de progresso das etapas */}
          <div className="flex items-center w-full justify-between space-x-6">

            <div className="flex items-center w-full justify-center space-x-6 ">
                {etapasSidebar.map((label, idx) => {
                  // Lógica para destacar a etapa correta
                  let isActive = false;
                  let isEnabled = false;
                  let isCompleted = false;
                  
                  if (idx === 0) {
                    isActive = (etapa === 0) || (etapa > 0 && etapa <= (quantidade || 0));
                    isEnabled = etapa >= 0;
                    isCompleted = verificarEtapaTomadoresCompleta();
                  } else if (idx === 1) {
                    isActive = etapa === (quantidade || 0) + 1;
                    isEnabled = etapa >= (quantidade || 0) + 1 || verificarEtapaTomadoresCompleta();
                    isCompleted = verificarEtapaEmprestimoCompleta();
                  } else if (idx === 2) {
                    isActive = etapa === (quantidade || 0) + 2;
                    isEnabled = etapa >= (quantidade || 0) + 2 || (verificarEtapaTomadoresCompleta() && verificarEtapaEmprestimoCompleta());
                    isCompleted = verificarEtapaGarantiaCompleta();
                  } else if (idx === 3) {
                    // Garantidores - sempre mostrar se as etapas anteriores estão completas e garantia é de terceiro
                    const garantidoresDevemAparecer = garantia.garantiaPertenceTomador?.Name === 'Imóvel de terceiro';
                    isActive = garantidoresDevemAparecer && ((showQtdGarantidores && etapa === (quantidade || 0) + 3) || (etapa >= (quantidade || 0) + 4 && etapa <= (quantidade || 0) + 4 + qtdGarantidores));
                    isEnabled = garantidoresDevemAparecer && (etapa >= (quantidade || 0) + 3 || (verificarEtapaTomadoresCompleta() && verificarEtapaEmprestimoCompleta() && verificarEtapaGarantiaCompleta()));
                    isCompleted = garantidoresDevemAparecer && verificarEtapaGarantidoresCompleta();
                  }
                  
                  // Determinar o ícone baseado no estado da etapa
                  const getStepIcon = () => {
                    switch (idx) {
                      case 0: return '👤';
                      case 1: return '💰';
                      case 2: return '🏠';
                      case 3: return '🛡️';
                      default: return '👤';
                    }
                  };

                  return (
                    <div key={label} className="flex items-center">
                      <button
                        className={`flex flex-col items-center space-y-3 px-6 py-4 rounded-xl transition-all duration-300 min-w-[120px] relative ${
                          isActive
                            ? 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-900 border-2 border-blue-400 shadow-lg'
                            : isCompleted
                              ? 'bg-gradient-to-br from-green-100 to-green-200 text-green-900 border-2 border-green-400 hover:from-green-200 hover:to-green-300 shadow-lg'
                              : isEnabled
                                ? 'bg-white text-gray-800 border-2 border-gray-300 hover:bg-gray-50 shadow-md'
                                : 'bg-gray-100 text-gray-500 border-2 border-gray-300'
                        }`}
                        disabled={!isEnabled}
                        onClick={() => {
                          if (!isEnabled) return;
                          if (idx === 0) {
                            // Navegar para tomadores - sempre vai para seleção de quantidade
                            setEtapa(0);
                          } else if (idx === 1) {
                            // Navegar para empréstimo - verificar renda mínima primeiro
                            const validacaoRenda = validarRendaMinima();
                            if (!validacaoRenda.aprovado) {
                              setMostrarErroRendaMinima(true);
                              return;
                            }
                            setEtapa((quantidade || 0) + 1);
                          } else if (idx === 2) {
                            // Navegar para garantia
                            setEtapa((quantidade || 0) + 2);
                          } else if (idx === 3) {
                            // Navegar para garantidores - sempre vai para seleção de quantidade
                            if (garantia.garantiaPertenceTomador?.Name === 'Imóvel de terceiro') {
                              setShowGarantidores(true);
                              setShowQtdGarantidores(true);
                              setEtapa((quantidade || 0) + 3);
                            }
                          }
                        }}
                      >
                        {/* Indicador de primeira etapa */}
                        {idx === 0 && (
                          <div className="absolute -top-2 -left-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md">
                            1º
                          </div>
                        )}
                        
                        {/* Indicador de última etapa */}
                        {idx === etapasSidebar.length - 1 && (
                          <div className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md">
                            Última
                          </div>
                        )}
                        
                        {/* Indicador numérico para todas as etapas */}
                        <div className="absolute -bottom-2 -left-2 bg-gray-700 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-md">
                          {idx + 1}
                        </div>
                        
                        <div className={`w-14 h-14 flex items-center justify-center rounded-full border-2 text-2xl ${
                          isActive 
                            ? 'border-blue-600 bg-blue-600 text-white shadow-lg' 
                            : isCompleted
                              ? 'border-green-600 bg-green-600 text-white shadow-lg'
                              : isEnabled
                                ? 'border-gray-500 bg-white text-gray-700 shadow-md'
                                : 'border-gray-400 bg-gray-200 text-gray-500'
                        }`}>
                          {getStepIcon()}
                        </div>
                        <span className="text-sm font-bold whitespace-nowrap">
                          {label}
                        </span>
                        {isActive && (
                          <span className="text-xs text-blue-700 font-bold flex items-center gap-1">
                            <span>▶</span> Etapa atual
                          </span>
                        )}
                        {isCompleted && (
                          <span className="text-xs text-green-700 font-bold flex items-center gap-1">
                            <span>✓</span> Concluída
                          </span>
                        )}
                        {!isEnabled && (
                          <span className="text-xs text-gray-600 font-bold flex items-center gap-1">
                            <span>🔒</span> Bloqueada
                          </span>
                        )}
                      </button>
                      
                      {/* Linha conectora entre etapas */}
                      {idx < etapasSidebar.length - 1 && (
                        <div className={`w-20 h-1 mx-3 rounded-full ${
                          isCompleted ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                      )}
                    </div>
                  );
                })}
            </div>
              
              {/* Botão de limpar dados */}
              {(quantidade || emprestimo.valorSolicitado || garantia.valorGarantia) && (
                <button
                  onClick={() => setShowModalLimparDados(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm w-48 shadow-md"
                  title="Limpar todos os dados preenchidos"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Limpar Dados
                </button>
              )}
          </div>
          
        </div>
      </div>
    );
  };
  
  // Sidebar dinâmica
  const etapasSidebar = showGarantidores
    ? [...etapas, 'Garantidores']
    : etapas;

  const renderSidebar = () => {
    const textoAtual = obterTextoDinamico();
    
    return (
      <aside className="w-64 bg-white rounded-2xl shadow-xl p-6 border-2 border-gray-200">
        <div className="text-sm text-gray-700">
          <h2 className="font-bold text-gray-900 mb-3 text-lg">{textoAtual.titulo}</h2>
          <p className="leading-relaxed">
            {textoAtual.descricao}
          </p>
        </div>
      </aside>
    );
  };

  // Estado de loading para seleção de quantidade de tomadores
  const [showQtdLoading, setShowQtdLoading] = useState(true);
  useEffect(() => {
    if (etapa === 0) {
      setShowQtdLoading(true);
      const timer = setTimeout(() => setShowQtdLoading(false), 500);
      return () => clearTimeout(timer);
    }
  }, [etapa]);

  // Renderização da etapa de seleção de quantidade
  const renderSelecaoQuantidade = () => {
    if (showQtdLoading) {
      return <LoadingStep msg="Carregando opções de quantidade de tomadores..." />;
    }
    return (
      <section className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-5xl space-y-8 flex flex-col items-center border-2 border-gray-200">
        {/* Header com ícone */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mr-4 shadow-xl">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-3">
            1. Quantidade de Tomadores
          </h2>
          <p className="text-gray-700 text-lg max-w-md leading-relaxed font-medium">
            Selecione quantos tomadores participarão desta operação de empréstimo
          </p>
        </div>
        
        {/* Campo de seleção */}
        <div className="w-full max-w-sm space-y-6">
          {loading && (
            <div className="text-center py-6 bg-gray-50 rounded-xl border border-gray-200">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
              <p className="text-gray-700 font-medium">Carregando opções...</p>
            </div>
          )}
          {error && (
            <div className="text-center py-4">
              <p className="text-red-700 bg-red-100 border-2 border-red-300 rounded-lg px-4 py-3 font-medium">{error}</p>
            </div>
          )}
          {!loading && !error && (
            <>
              {/* Campo de quantidade de tomadores */}
            <div className="space-y-4">
              <label className="block text-sm font-bold text-gray-800 mb-3 text-center">
                Quantidade de Tomadores
              </label>
              <div className="bg-gray-50 p-4 rounded-xl border-2 border-gray-200">
                <SelectInput
                  options={options.filter(o => o.Name !== '0')}
                  value={quantidadeId ?? undefined}
                  onChange={opt => {
                    setQuantidadeId(Number(opt.Id));
                    setQuantidade(Number(opt.Name));
                    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ Id: opt.Id, Name: opt.Name }));
                  }}
                  placeholder="Selecione a quantidade"
                />
              </div>
            </div>

              {/* Campo de e-mail do parceiro responsável */}
              <div className="space-y-4">
                <label className="block text-sm font-bold text-gray-800 mb-3 text-center">
                  E-mail do Parceiro Responsável
                </label>
                <div className="bg-gray-50 p-4 rounded-xl border-2 border-gray-200">
                  <input
                    type="email"
                    value={emailParceiroResponsavel}
                    onChange={(e) => {
                      const value = e.target.value;
                      setEmailParceiroResponsavel(value);
                      
                      // Validar formato do e-mail
                      if (value.trim() && !validarEmail(value)) {
                        setErroEmailParceiro('Por favor, digite um e-mail válido');
                      } else {
                        setErroEmailParceiro('');
                      }
                      
                      localStorage.setItem(EMAIL_PARCEIRO_STORAGE_KEY, value);
                    }}
                    placeholder="exemplo@parceiro.com"
                    className={`w-full px-4 py-3 text-gray-800 bg-white border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 ${
                      erroEmailParceiro ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                </div>
                {erroEmailParceiro && (
                  <p className="text-xs text-red-500 text-center mt-2">
                    {erroEmailParceiro}
                  </p>
                )}
                <p className="text-xs text-gray-600 text-center">
                  Precisamos do e-mail do parceiro responsável pela operação para enviar a proposta final
                </p>
              </div>
            </>
          )}
        </div>
        
        {/* Botão */}
        <div className="w-full max-w-sm">
          <button
            className="w-full py-5 px-6 font-bold text-lg rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white hover:from-blue-700 hover:to-indigo-800 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl"
            onClick={() => {
              // Validar e-mail antes de continuar
              if (emailParceiroResponsavel.trim() && !validarEmail(emailParceiroResponsavel)) {
                setErroEmailParceiro('Por favor, digite um e-mail válido');
                return;
              }
              setEtapa(1);
            }}
            disabled={!quantidade || !emailParceiroResponsavel.trim() || !!erroEmailParceiro}
          >
            <div className="flex items-center justify-center">
              <span>Continuar</span>
              <svg className="w-6 h-6 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          </button>
        </div>
      </section>
    );
  };

  // Estado de transição entre etapas
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [nextEtapa, setNextEtapa] = useState<number | null>(null);

  // Componente de loading
  const LoadingStep = ({ msg }: { msg: string }) => (
    <div className="flex flex-col items-center justify-center h-96 bg-white rounded-2xl shadow-2xl p-8 border-2 border-gray-200">
      <svg className="animate-spin h-12 w-12 text-blue-600 mb-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
      </svg>
      <span className="text-blue-800 text-lg font-bold">{msg}</span>
    </div>
  );

  // Função para verificar se as opções de tomadores estão carregando
  const verificarCarregamentoTomadores = () => {
    if (!carregarOpcoesTomadores) return false;
    
    const isLoading = estadoCivilOptionsArr.some(opt => opt.loading) ||
           tipoPessoaOptionsArr.some(opt => opt.loading) ||
           qualificacaoProfissaoOptionsArr.some(opt => opt.loading) ||
           comprovacaoRendaFormalOptionsArr.some(opt => opt.loading) ||
           comprovacaoRendaInformalOptionsArr.some(opt => opt.loading) ||
           quantidadeSociosOptionsArr.some(opt => opt.loading) ||
           numeroAdminOptionsArr.some(opt => opt.loading);
    
    return isLoading;
  };

  // Função para verificar se as opções de empréstimo estão carregando
  const verificarCarregamentoEmprestimo = () => {
    if (!carregarOpcoesEmprestimo) return false;
    
    const isLoading = amortizacaoOptions.loading ||
           carenciaOptions.loading ||
           motivoEmprestimoOptions.loading;
    
    return isLoading;
  };

  // Função para verificar se as opções de garantia estão carregando
  const verificarCarregamentoGarantia = () => {
    if (!carregarOpcoesGarantia) return false;
    
    const isLoading = pertenceTomadorOptions.loading ||
           utilizacaoGarantiaOptions.loading ||
           tipoGarantiaOptions.loading ||
           cidadeGarantiaOptions.loading ||
           ruralUrbanoOptions.loading ||
           unidadeFederativaOptions.loading ||
           comQuemEstaFinanciadaOptions.loading ||
           dividaITROptions.loading;
    
    return isLoading;
  };

  // Função para verificar se as opções de garantidores estão carregando
  const verificarCarregamentoGarantidores = () => {
    if (!carregarOpcoesGarantidores) return false;
    
    const isLoading = loadingGarantidores ||
           estadoCivilGarantidoresOptionsArr.some(opt => opt.loading) ||
           tipoPessoaOptionsGarantidorArr.some(opt => opt.loading) ||
           grauParentescoOptions.loading;
    
    return isLoading;
  };

  // Formulário de cadastro de tomador
  const renderCadastroTomador = () => {
    const idx = etapa - 1;
    const tomador = tomadores[idx] || { ...initialTomador };

    // Verificar se as opções estão carregando
    if (verificarCarregamentoTomadores()) {
      return (
        <section className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-5xl flex flex-col items-center justify-center">
          <LoadingStep msg="Carregando opções de tomadores..." />
        </section>
      );
    }

    const estadoCivilOptions = estadoCivilOptionsArr[idx];
    const tipoPessoaOptions = tipoPessoaOptionsArr[idx];
    const qualificacaoProfissaoOptions = qualificacaoProfissaoOptionsArr[idx];
    const comprovacaoRendaFormalOptions = comprovacaoRendaFormalOptionsArr[idx];
    const comprovacaoRendaInformalOptions = comprovacaoRendaInformalOptionsArr[idx];
    const quantidadeSociosOptions = quantidadeSociosOptionsArr[idx];
    const numeroAdminOptions = numeroAdminOptionsArr[idx];



    return (
      <section className={`bg-white rounded-2xl shadow-lg p-8 w-full max-w-5xl flex flex-col items-center justify-center transition-all duration-300 ease-in-out ${
        isTransitioning ? 'opacity-0 transform scale-95' : 'opacity-100 transform scale-100'
      }`}>
        <h2 className="text-lg font-bold text-blue-900 mb-4">Tomador {idx + 1}</h2>
        <form className="w-full space-y-6">
          {/* Dados Pessoais */}
          <fieldset className="border border-blue-200 rounded-xl p-4 mb-2">
            <legend className="text-blue-900 font-semibold px-2">Dados Pessoais</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              {/* Estado Civil - apenas para pessoa física */}
              <SelectInput
                options={tipoPessoaOptions?.options || []}
                value={tomador.tipoPessoa?.Id ? String(tomador.tipoPessoa.Id) : undefined}
                onChange={opt => {
                  limparErro('tipoPessoa');
                  const novoTipoPessoa = opt.Name?.toLowerCase().trim();
                  const tipoPessoaAnterior = tomador.tipoPessoa?.Name?.toLowerCase().trim() || '';
                  
                  // Verificar se realmente mudou o tipo
                  const mudouParaPJ = novoTipoPessoa === 'pessoa jurídica' && tipoPessoaAnterior !== 'pessoa jurídica';
                  const mudouParaPF = novoTipoPessoa === 'pessoa física' && tipoPessoaAnterior !== 'pessoa física';
                  
                  setTomadores(prev => {
                    const novo = [...prev];
                    const tomadorAtual = { ...novo[idx] };
                    
                    // Se mudou de Pessoa Física para Pessoa Jurídica, limpar campos específicos de PF
                    if (mudouParaPJ) {
                      tomadorAtual.estadoCivil = { Id: '', Name: '' };
                      tomadorAtual.cpf = '';
                      tomadorAtual.qualificacaoProfissional = { Id: '', Name: '' };
                      tomadorAtual.profissao = '';
                      tomadorAtual.rendaFormal = '';
                      tomadorAtual.comprovacaoRendaFormal = { Id: '', Name: '' };
                      tomadorAtual.possuiPJVinculada = { Id: '', Name: '' };
                      tomadorAtual.pjComporRenda = { Id: '', Name: '' };
                      tomadorAtual.quantidadePJ = '';
                      tomadorAtual.pjsVinculadas = [];
                    }
                    
                    // Se mudou de Pessoa Jurídica para Pessoa Física, limpar campos específicos de PJ
                    if (mudouParaPF) {
                      tomadorAtual.cnpj = '';
                      tomadorAtual.quantidadeSociosPJ = { Id: '', Name: '' };
                      tomadorAtual.numeroAdmin = { Id: '', Name: '' };
                      tomadorAtual.ramoPJ = '';
                    }
                    
                    novo[idx] = { ...tomadorAtual, tipoPessoa: { Id: opt.Id, Name: opt.Name } };
                    return novo;
                  });
                }}
                label="Tipo Pessoa"
                placeholder="Pessoa Física ou Jurídica"
                error={erros.tipoPessoa}
                tooltip="Selecione se você é uma pessoa física (CPF) ou jurídica (CNPJ)"
              />

              {tomador.tipoPessoa?.Name?.toLowerCase() !== 'pessoa jurídica' && (
                <SelectInput
                  options={estadoCivilOptions?.options || []}
                  value={tomador.estadoCivil?.Id ? String(tomador.estadoCivil.Id) : undefined}
                  onChange={opt => {
                    limparErro('estadoCivil');
                    setTomadores(prev => {
                      const novo = [...prev];
                      novo[idx] = { ...novo[idx], estadoCivil: { Id: opt.Id, Name: opt.Name } };
                      return novo;
                    });
                  }}
                  label="Estado Civil"
                  placeholder="Selecione o estado civil"
                  error={erros.estadoCivil}
                  tooltip="Selecione seu estado civil atual (solteiro, casado, divorciado, etc.)"
                />
              )}
              <InputText
                inputName={tomador.tipoPessoa?.Name?.toLowerCase() !== 'pessoa jurídica' ? 'Nome' : 'Razão Social'}
                termo={tomador.nome}
                onSetName={v => {
                  limparErro('nome');
                  setTomadores(prev => { const novo = [...prev]; novo[idx] = { ...novo[idx], nome: v }; return novo; });
                }}
                placeholder={tomador.tipoPessoa?.Name?.toLowerCase() !== 'pessoa jurídica' ? 'Digite o nome' : 'Digite a razão social'}
                typeInput="Text"
                error={erros.nome}
                tooltip="Digite seu nome completo como consta nos documentos"
              />
              <InputText
                inputName={tomador.tipoPessoa?.Name?.toLowerCase() !== 'pessoa jurídica' ? 'Data de Nascimento' : 'Data de Nascimento do Sócio Mais Velho'}
                termo={tomador.dataNascimento}
                onSetName={v => {
                  limparErro('dataNascimento');
                  setTomadores(prev => { const novo = [...prev]; novo[idx] = { ...novo[idx], dataNascimento: v }; return novo; });
                }}
                placeholder="dd/mm/aaaa"
                typeInput="Date"
                error={erros.dataNascimento}
                tooltip="Digite sua data de nascimento (idade máxima: 80 anos)"
              />
              <InputText
                inputName="CPF"
                termo={tomador.cpf}
                onSetName={v => {
                  limparErro('cpf');
                  setTomadores(prev => { const novo = [...prev]; novo[idx] = { ...novo[idx], cpf: v }; return novo; });
                }}
                placeholder="Digite seu CPF"
                typeInput="Cpf"
                error={erros.cpf}
                tooltip="Digite seu CPF completo (apenas números ou com pontos e traços)"
              />
            </div>
          </fieldset>

          {/* Contato - pessoa física e juridica */}
          <fieldset className="border border-blue-200 rounded-xl p-4 mb-4">
            <legend className="text-blue-900 font-semibold px-2">Contato</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputText
                inputName="Email"
                termo={tomador.email}
                onSetName={v => {
                  limparErro('email');
                  setTomadores(prev => { const novo = [...prev]; novo[idx] = { ...novo[idx], email: v }; return novo; });
                }}
                placeholder="Digite seu email"
                typeInput="Text"
                error={erros.email}
                tooltip="Digite seu email válido para contato (ex: nome@email.com)"
              />
              <InputText
                inputName="Telefone"
                termo={tomador.telefone}
                onSetName={v => {
                  limparErro('telefone');
                  setTomadores(prev => { const novo = [...prev]; novo[idx] = { ...novo[idx], telefone: v }; return novo; });
                }}
                placeholder="Digite seu telefone"
                typeInput="Phone"
                error={erros.telefone}
                tooltip="Digite seu telefone com DDD (celular ou fixo)"
              />
            </div>
          </fieldset>

          {/* Profissional - apenas para pessoa física */}
          {tomador.tipoPessoa?.Name?.toLowerCase() !== 'pessoa jurídica' && (
            <fieldset className="border border-blue-200 rounded-xl p-4 mb-4">
              <legend className="text-blue-900 font-semibold px-2">Profissional</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputText
                  inputName={tomador.qualificacaoProfissional?.Name?.toLowerCase() === 'autônomo(a)' ? "Ramo do trabalho" : "Profissão"}
                  termo={tomador.profissao}
                  onSetName={v => {
                    limparErro('profissao');
                    setTomadores(prev => { const novo = [...prev]; novo[idx] = { ...novo[idx], profissao: v }; return novo; });
                  }}
                  placeholder={tomador.qualificacaoProfissional?.Name?.toLowerCase() === 'autônomo(a)' ? "Digite o ramo do trabalho" : "Digite a profissão"}
                  typeInput="Text"
                  error={erros.profissao}
                  tooltip={tomador.qualificacaoProfissional?.Name?.toLowerCase() === 'autônomo(a)' ? "Digite o ramo do trabalho que você exerce" : "Digite sua profissão ou cargo atual"}
                />
                <SelectInput
                  options={qualificacaoProfissaoOptions?.options || []}
                  value={tomador.qualificacaoProfissional?.Id ? String(tomador.qualificacaoProfissional.Id) : undefined}
                  onChange={opt => {
                    limparErro('qualificacaoProfissional');
                    const novaQualificacao = opt.Name?.toLowerCase();
                    const qualificacaoAnterior = tomador.qualificacaoProfissional?.Name?.toLowerCase();
                    
                    setTomadores(prev => {
                      const novo = [...prev];
                      const tomadorAtual = { ...novo[idx] };
                      
                      // Se mudou de Empresário(a) para outra qualificação, limpar campos de PJ vinculada
                      // (CNPJ e ramoPJ só aparecem para Empresário)
                      if (qualificacaoAnterior === 'empresário(a)' && novaQualificacao !== 'empresário(a)') {
                        tomadorAtual.cnpj = '';
                        tomadorAtual.ramoPJ = '';
                      }
                      
                      novo[idx] = { ...tomadorAtual, qualificacaoProfissional: { Id: opt.Id, Name: opt.Name } };
                      return novo;
                    });
                  }}
                  label="Qualificação Profissional"
                  placeholder="Digite a qualificação"
                  error={erros.qualificacaoProfissional}
                  tooltip="Selecione sua qualificação profissional (empregado, autônomo, empresário, etc.)"
                />
              </div>
            </fieldset>
          )}

           {/* Documentação */}
           <fieldset className="border border-blue-200 rounded-xl p-4 mb-4">
            <legend className="text-blue-900 font-semibold px-2">Informações da PJ</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              { tomador.tipoPessoa?.Name?.toLowerCase() === 'pessoa jurídica' ? (
                <>
                  {quantidadeSociosOptions?.loading ? (
                    <div className="flex flex-col w-full">
                      <div className="flex items-center gap-2 mb-1">
                        <label className="text-sm font-medium text-blue-900">Quantidade de Sócios da PJ</label>
                        <span className="text-blue-400 cursor-help text-sm hover:text-blue-600 transition-colors">ⓘ</span>
                      </div>
                      <div className="h-10 bg-gray-100 rounded animate-pulse flex items-center px-3">
                        <span className="text-gray-500">Carregando opções...</span>
                      </div>
                    </div>
                  ) : quantidadeSociosOptions?.error ? (
                    <div className="flex flex-col w-full">
                      <div className="flex items-center gap-2 mb-1">
                        <label className="text-sm font-medium text-blue-900">Quantidade de Sócios da PJ</label>
                        <span className="text-blue-400 cursor-help text-sm hover:text-blue-600 transition-colors">ⓘ</span>
                      </div>
                      <div className="h-10 bg-red-50 border border-red-200 rounded flex items-center px-3">
                        <span className="text-red-600 text-sm">Erro ao carregar opções: {quantidadeSociosOptions.error}</span>
                      </div>
                    </div>
                  ) : (
                    <SelectInput
                      options={quantidadeSociosOptions?.options || []}
                      value={tomador.quantidadeSociosPJ?.Id ? String(tomador.quantidadeSociosPJ.Id) : undefined}
                      onChange={opt => {
                        limparErro('quantidadeSociosPJ');
                        setTomadores(prev => {
                          const novo = [...prev];
                          novo[idx] = { ...novo[idx], quantidadeSociosPJ: { Id: opt.Id, Name: opt.Name } };
                          return novo;
                        });
                      }}
                      placeholder="Informe a quantidade de sócios"
                      label="Quantidade de Sócios da PJ"
                      error={erros.quantidadeSociosPJ}
                      tooltip="Selecione a quantidade total de sócios da pessoa jurídica"
                    />
                  )}
                  {numeroAdminOptions?.loading ? (
                    <div className="flex flex-col w-full">
                      <div className="flex items-center gap-2 mb-1">
                        <label className="text-sm font-medium text-blue-900">N° de admin</label>
                        <span className="text-blue-400 cursor-help text-sm hover:text-blue-600 transition-colors">ⓘ</span>
                      </div>
                      <div className="h-10 bg-gray-100 rounded animate-pulse flex items-center px-3">
                        <span className="text-gray-500">Carregando opções...</span>
                      </div>
                    </div>
                  ) : numeroAdminOptions?.error ? (
                    <div className="flex flex-col w-full">
                      <div className="flex items-center gap-2 mb-1">
                        <label className="text-sm font-medium text-blue-900">N° de admin</label>
                        <span className="text-blue-400 cursor-help text-sm hover:text-blue-600 transition-colors">ⓘ</span>
                      </div>
                      <div className="h-10 bg-red-50 border border-red-200 rounded flex items-center px-3">
                        <span className="text-red-600 text-sm">Erro ao carregar opções: {numeroAdminOptions.error}</span>
                      </div>
                    </div>
                  ) : (
                    <SelectInput
                      options={numeroAdminOptions?.options || []}
                      value={tomador.numeroAdmin?.Id ? String(tomador.numeroAdmin.Id) : undefined}
                      onChange={opt => {
                        limparErro('numeroAdmin');
                        setTomadores(prev => {
                          const novo = [...prev];
                          novo[idx] = { ...novo[idx], numeroAdmin: { Id: opt.Id, Name: opt.Name } };
                          return novo;
                        });
                      }}
                      placeholder="Informe o número de administradores"
                      label="N° de admin"
                      error={erros.numeroAdmin}
                      tooltip="Selecione o número de administradores da pessoa jurídica"
                    />
                  )}
                  <InputText
                    inputName="CNPJ"
                    termo={tomador.cnpj}
                    onSetName={v => {
                      limparErro('cnpj');
                      setTomadores(prev => { const novo = [...prev]; novo[idx] = { ...novo[idx], cnpj: v }; return novo; });
                    }}
                    placeholder="Digite seu CNPJ"
                    typeInput="Cnpj"
                    error={erros.cnpj}
                    tooltip="Digite o CNPJ da empresa (apenas números ou com pontos, barra e traços)"
                  />
                  <InputText
                    inputName="Digite qual o Ramo da PJ"
                    termo={tomador.ramoPJ}
                    onSetName={v => {
                      limparErro('ramoPJ');
                      setTomadores(prev => { const novo = [...prev]; novo[idx] = { ...novo[idx], ramoPJ: v }; return novo; });
                    }}
                    placeholder="Informe o ramo da PJ"
                    typeInput="Text"
                    error={erros.ramoPJ}
                    tooltip="Digite o ramo de atividade da pessoa jurídica (ex: comércio, indústria, serviços)"
                  />
                </>
              ) : 
              (
                <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-lg p-4 text-center">
                  Caso seja Pessoa Jurídica, selecione o tipo de pessoa Jurídica para exibir os campos de informações da PJ.
                </div>
              )}
            </div>
          </fieldset>

          {/* Perguntas sobre PJ Vinculada - apenas para pessoa física e primeiro tomador */}
          {tomador.tipoPessoa?.Name?.toLowerCase() === 'pessoa física' && idx === 0 && (
            <fieldset className="border border-green-200 rounded-xl p-4 mb-4">
              <legend className="text-green-900 font-semibold px-2">Pessoa Jurídica Vinculada</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SelectInput
                  options={opcoesSimNao}
                  value={tomador.possuiPJVinculada?.Id ? String(tomador.possuiPJVinculada.Id) : undefined}
                  onChange={opt => {
                    limparErro('possuiPJVinculada');
                    setTomadores(prev => {
                      const novo = [...prev];
                      novo[idx] = { 
                        ...novo[idx], 
                        possuiPJVinculada: { Id: opt.Id, Name: opt.Name },
                        // Limpar campos relacionados se responder "Não"
                        pjComporRenda: opt.Name === 'Não' ? { Id: '', Name: '' } : novo[idx].pjComporRenda,
                        quantidadePJ: opt.Name === 'Não' ? '' : novo[idx].quantidadePJ,
                        pjsVinculadas: opt.Name === 'Não' ? [] : novo[idx].pjsVinculadas || []
                      };
                      return novo;
                    });
                  }}
                  label="Possui uma PJ vinculada ao nome do tomador?"
                  placeholder="Selecione uma opção"
                  error={erros.possuiPJVinculada}
                  tooltip="Informe se você possui uma Pessoa Jurídica vinculada ao nome do tomador"
                />
                
                {/* Pergunta sobre composição de renda - só aparece se responder "Sim" */}
                {tomador.possuiPJVinculada?.Name === 'Sim' && (
                  <SelectInput
                    options={opcoesSimNao}
                    value={tomador.pjComporRenda?.Id ? String(tomador.pjComporRenda.Id) : undefined}
                    onChange={opt => {
                      limparErro('pjComporRenda');
                      setTomadores(prev => {
                        const novo = [...prev];
                        novo[idx] = { 
                          ...novo[idx], 
                          pjComporRenda: { Id: opt.Id, Name: opt.Name }
                        };
                        return novo;
                      });
                    }}
                    label="Esta PJ irá compor renda?"
                    placeholder="Selecione uma opção"
                    error={erros.pjComporRenda}
                    tooltip="Informe se a receita desta PJ será considerada para composição da sua renda"
                  />
                )}
              </div>

              {/* Campo "Quantas PJ?" - só aparece se responder "Sim" */}
              {tomador.possuiPJVinculada?.Name === 'Sim' && (
                <div className="mt-4">
                  <InputText
                    inputName="Quantas PJ?"
                    termo={tomador.quantidadePJ || ''}
                    onSetName={v => {
                      limparErro('quantidadePJ');
                      // Permitir apenas números e limitar a 10
                      const valorNumerico = v.replace(/\D/g, '');
                      const quantidade = valorNumerico ? Math.min(parseInt(valorNumerico, 10), 10) : '';
                      
                      setTomadores(prev => {
                        const novo = [...prev];
                        const quantidadeAnterior = parseInt(novo[idx].quantidadePJ || '0', 10) || 0;
                        const novaQuantidade = quantidade ? parseInt(String(quantidade), 10) : 0;
                        
                        // Ajustar array de PJs vinculadas baseado na nova quantidade
                        let pjsVinculadas = novo[idx].pjsVinculadas || [];
                        if (novaQuantidade > quantidadeAnterior) {
                          // Adicionar novos objetos vazios
                          for (let i = quantidadeAnterior; i < novaQuantidade; i++) {
                            pjsVinculadas.push({ nome: '', cnpj: '' });
                          }
                        } else if (novaQuantidade < quantidadeAnterior) {
                          // Remover objetos extras
                          pjsVinculadas = pjsVinculadas.slice(0, novaQuantidade);
                        }
                        
                        novo[idx] = { 
                          ...novo[idx], 
                          quantidadePJ: quantidade ? String(quantidade) : '',
                          pjsVinculadas
                        };
                        return novo;
                      });
                    }}
                    placeholder="Digite a quantidade (máximo 10)"
                    typeInput="Text"
                    error={erros.quantidadePJ}
                    tooltip="Informe quantas Pessoas Jurídicas estão vinculadas ao seu nome (máximo 10)"
                  />
                </div>
              )}

              {/* Campos dinâmicos para Nome e CNPJ de cada PJ */}
              {tomador.possuiPJVinculada?.Name === 'Sim' && 
               tomador.quantidadePJ && 
               parseInt(tomador.quantidadePJ, 10) > 0 && (
                <div className="mt-4 space-y-4">
                  <h4 className="text-green-800 font-semibold mb-2">Informações das Pessoas Jurídicas</h4>
                  {Array.from({ length: Math.min(parseInt(tomador.quantidadePJ, 10), 10) }, (_, index) => {
                    const pj = tomador.pjsVinculadas?.[index] || { nome: '', cnpj: '' };
                    return (
                      <div key={index} className="border border-green-200 rounded-lg p-4 bg-green-50">
                        <h5 className="text-green-700 font-medium mb-3">PJ {index + 1}</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <InputText
                            inputName={`Nome da PJ ${index + 1}`}
                            termo={pj.nome || ''}
                            onSetName={v => {
                              limparErro(`pjVinculada_nome_${index}`);
                              setTomadores(prev => {
                                const novo = [...prev];
                                const pjsVinculadas = [...(novo[idx].pjsVinculadas || [])];
                                if (!pjsVinculadas[index]) {
                                  pjsVinculadas[index] = { nome: '', cnpj: '' };
                                }
                                pjsVinculadas[index] = { ...pjsVinculadas[index], nome: v };
                                novo[idx] = { ...novo[idx], pjsVinculadas };
                                return novo;
                              });
                            }}
                            placeholder="Digite o nome da PJ"
                            typeInput="Text"
                            error={erros[`pjVinculada_nome_${index}`]}
                            tooltip="Digite o nome ou razão social da Pessoa Jurídica"
                          />
                          <InputText
                            inputName={`CNPJ da PJ ${index + 1}`}
                            termo={pj.cnpj || ''}
                            onSetName={v => {
                              limparErro(`pjVinculada_cnpj_${index}`);
                              // O formatador CNPJ já limita a 14 dígitos automaticamente
                              setTomadores(prev => {
                                const novo = [...prev];
                                const pjsVinculadas = [...(novo[idx].pjsVinculadas || [])];
                                if (!pjsVinculadas[index]) {
                                  pjsVinculadas[index] = { nome: '', cnpj: '' };
                                }
                                pjsVinculadas[index] = { ...pjsVinculadas[index], cnpj: v };
                                novo[idx] = { ...novo[idx], pjsVinculadas };
                                return novo;
                              });
                            }}
                            placeholder="00.000.000/0000-00"
                            typeInput="Cnpj"
                            error={erros[`pjVinculada_cnpj_${index}`]}
                            tooltip="Digite o CNPJ da Pessoa Jurídica (14 dígitos)"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </fieldset>
          )}

          {/* Renda */}
          <fieldset className="border border-blue-200 rounded-xl p-4 mb-4">
            <legend className="text-blue-900 font-semibold px-2">Renda</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Renda Formal - apenas para pessoa física, exceto empresário(a) e autônomo(a) */}
              {tomador.tipoPessoa?.Name?.toLowerCase() !== 'pessoa jurídica' && 
               tomador.qualificacaoProfissional?.Name?.toLowerCase() !== 'empresário(a)' &&
               tomador.qualificacaoProfissional?.Name?.toLowerCase() !== 'autônomo(a)' && (
                <>
                  <SelectInput
                    options={comprovacaoRendaFormalOptions?.options || []}
                    value={tomador.comprovacaoRendaFormal?.Id ? String(tomador.comprovacaoRendaFormal.Id) : undefined}
                    onChange={opt => {
                      limparErro('comprovacaoRendaFormal');
                      const isNaoSeAplica = opt.Name?.toLowerCase() === 'não se aplica';
                      setTomadores(prev => {
                        const novo = [...prev];
                        novo[idx] = { 
                          ...novo[idx], 
                          comprovacaoRendaFormal: { Id: opt.Id, Name: opt.Name },
                          rendaFormal: isNaoSeAplica ? 'R$ 0,00' : novo[idx].rendaFormal
                        };
                        return novo;
                      });
                    }}
                    label="Comprovação de renda formal"
                    placeholder="Comprovação de renda formal"
                    error={erros.comprovacaoRendaFormal}
                    tooltip="Selecione como você comprova sua renda formal (holerite, contracheque, etc.)"
                  />
                  <InputText
                    inputName="Renda Formal"
                    termo={tomador.comprovacaoRendaFormal?.Name?.toLowerCase() === 'não se aplica' ? 'R$ 0,00' : tomador.rendaFormal}
                    onSetName={v => {
                      limparErro('rendaFormal');
                      setTomadores(prev => { 
                        const novo = [...prev]; 
                        novo[idx] = { ...novo[idx], rendaFormal: v }; 
                        return novo; 
                      });
                    }}
                    placeholder="Renda formal"
                    typeInput="Money"
                    error={erros.rendaFormal}
                    tooltip="Digite o valor da sua renda formal (salário, pró-labore, etc.)"
                    disabled={tomador.comprovacaoRendaFormal?.Name?.toLowerCase() === 'não se aplica'}
                  />
                </>
              )}
              <SelectInput
                options={comprovacaoRendaInformalOptions?.options || []}
                value={tomador.comprovacaoRendaInformal?.Id ? String(tomador.comprovacaoRendaInformal.Id) : undefined}
                onChange={opt => {
                  limparErro('comprovacaoRendaInformal');
                  const isNaoSeAplica = opt.Name?.toLowerCase() === 'não se aplica';
                  setTomadores(prev => {
                    const novo = [...prev];
                    novo[idx] = { 
                      ...novo[idx], 
                      comprovacaoRendaInformal: { Id: opt.Id, Name: opt.Name },
                      rendaInformal: isNaoSeAplica ? 'R$ 0,00' : novo[idx].rendaInformal
                    };
                    return novo;
                  });
                }}
                label="Comprovação de renda informal"
                placeholder="Comprovação de renda informal"
                error={erros.comprovacaoRendaInformal}
                tooltip="Selecione como você comprova sua renda informal (se aplicável)"
              />
              <InputText
                inputName="Renda Informal"
                termo={tomador.comprovacaoRendaInformal?.Name?.toLowerCase() === 'não se aplica' ? 'R$ 0,00' : tomador.rendaInformal}
                onSetName={v => {
                  limparErro('rendaInformal');
                  setTomadores(prev => { 
                    const novo = [...prev]; 
                    novo[idx] = { ...novo[idx], rendaInformal: v }; 
                    return novo; 
                  });
                }}
                placeholder="Renda informal"
                typeInput="Money"
                error={erros.rendaInformal}
                tooltip="Digite o valor da sua renda informal (freelance, bicos, etc.)"
                disabled={tomador.comprovacaoRendaInformal?.Name?.toLowerCase() === 'não se aplica'}
              />
              <div className="sm:col-span-2">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold text-blue-900">Renda Total Informada</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-blue-400 cursor-help text-sm hover:text-blue-600 transition-colors">ⓘ</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Valor total calculado automaticamente (Renda Formal + Renda Informal)</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                    <input
                      value={tomador.rendaTotalInformada}
                      onChange={() => {}} // Campo bloqueado, não permite edição
                      placeholder="Renda total (calculada automaticamente)"
                      className="relative w-full px-4 py-4 rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 text-gray-800 font-bold text-xl shadow-lg cursor-not-allowed transition-all duration-300 hover:shadow-xl"
                      disabled={true}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                      <div className="flex items-center gap-2 text-blue-600 bg-white/80 backdrop-blur-sm rounded-full px-3 py-1 shadow-sm">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs font-semibold">Calculado</span>
                      </div>
                    </div>
                  </div>
                  {erros.rendaTotalInformada && (
                    <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {erros.rendaTotalInformada}
                    </div>
                  )}
                  <div className="mt-3 text-sm text-blue-700 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3 shadow-sm">
                    <div className="flex-shrink-0 mt-0.5">
                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-blue-800 mb-1">Valor Calculado Automaticamente</p>
                      <p className="text-blue-600 text-xs leading-relaxed">Este valor é calculado automaticamente com base nas rendas formal e informal informadas acima. O sistema soma os valores e exibe o total aqui.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Informações sobre documentos necessários */}
              <div className="sm:col-span-2 mt-4">
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-amber-800 mb-2">📋 Documentos Necessários para Comprovação de Renda</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2">
                          <span className="text-amber-700 font-medium min-w-[60px]">Formal:</span>
                          <span className="text-amber-600">3 meses de holerite ou INSS + 3 meses extratos bancários.</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-amber-700 font-medium min-w-[60px]">Informal:</span>
                          <span className="text-amber-600">3 meses de extratos bancários</span>
                        </div>
                        {/* Documentos PJ - só aparece se for pessoa física com PJ vinculada */}
                        {tomador.tipoPessoa?.Name?.toLowerCase() === 'pessoa física' && tomador.possuiPJVinculada?.Name === 'Sim' && (
                          <>
                            {tomador.pjComporRenda?.Name === 'Não' && (
                              <div className="flex items-start gap-2">
                                <span className="text-amber-700 font-medium min-w-[60px]">PJ:</span>
                                <span className="text-amber-600">Cartão CNPJ e contrato social</span>
                              </div>
                            )}
                            {tomador.pjComporRenda?.Name === 'Sim' && (
                              <div className="flex items-start gap-2">
                                <span className="text-amber-700 font-medium min-w-[60px]">PJ:</span>
                                <span className="text-amber-600">Balanço, DRE e faturamento</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      <div className="mt-3 p-2 bg-amber-100 rounded border border-amber-200">
                        <p className="text-xs text-amber-800">
                          <strong>📁 Envio de Documentos:</strong> Os documentos ficarão disponíveis para upload na aba "Meus Cadastros" após o envio desta proposta.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
          </div>
          </fieldset>

          <div className="flex w-full justify-between mt-6">
            <button
              className="py-2 px-6 font-medium rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
              type="button"
              onClick={() => {
                setErros({});
                setMostrarErro(false);
                transitionToEtapa(etapa - 1);
              }}
            >
              Voltar
            </button>
            <button
              className="py-2 px-6 font-medium rounded-full bg-blue-700 text-white hover:bg-blue-800 transition ml-4"
              type="button"
              onClick={() => {
                const tomadorAtual = tomadores[etapa - 1] || { ...initialTomador };
                const validacao = validarTomador(tomadorAtual, etapa - 1);
                
                if (!validacao.valido) {
                  setErros(validacao.erros);
                  setMostrarErro(true);
                  return;
                }
                
                // Se estamos no último tomador, verificar a renda mínima
                if (etapa === (quantidade || 0)) {
                  const validacaoRenda = validarRendaMinima();
                  if (!validacaoRenda.aprovado) {
                    setMostrarErroRendaMinima(true);
                    return;
                  }
                }
                
                setErros({});
                setMostrarErro(false);
                
                // Usar transição suave para próxima etapa
                transitionToEtapa(etapa + 1);
              }}
            >
              Próxima Etapa
            </button>
          </div>
        </form>
      </section>
    );
  };

  const renderModalErro = () => {
    if (!mostrarErro) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-red-500 text-2xl font-bold">✕</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Oops...</h3>
            <p className="text-gray-600 mb-6">
              Por favor, preencha todos os campos obrigatórios do Tomador {etapa}.
            </p>
            <button
              onClick={() => setMostrarErro(false)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderModalErroEmprestimo = () => {
    if (!mostrarErroEmprestimo) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center mb-4">
            <svg className="w-6 h-6 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900">Campos Obrigatórios</h3>
          </div>
          <p className="text-gray-700 mb-4">
            Por favor, preencha todos os campos obrigatórios antes de continuar.
          </p>
          <button
            onClick={() => setMostrarErroEmprestimo(false)}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
          >
            Entendi
          </button>
        </div>
      </div>
    );
  };

  const renderModalErroGarantia = () => {
    if (!mostrarErroGarantia) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center mb-4">
            <svg className="w-6 h-6 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900">Campos Obrigatórios</h3>
          </div>
          <p className="text-gray-700 mb-4">
            Por favor, preencha todos os campos obrigatórios antes de continuar.
          </p>
          <button
            onClick={() => setMostrarErroGarantia(false)}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
          >
            Entendi
          </button>
        </div>
      </div>
    );
  };

  // Renderização da etapa de empréstimo (formulário preenchível)
  const renderEmprestimo = () => {
    // Verificar se as opções estão carregando
    if (verificarCarregamentoEmprestimo()) {
      return (
        <section className={`bg-white rounded-2xl shadow-lg p-8 w-full max-w-5xl flex flex-col items-center justify-center transition-all duration-300 ease-in-out ${
          isTransitioning ? 'opacity-0 transform scale-95' : 'opacity-100 transform scale-100'
        }`}>
          <LoadingStep msg="Carregando opções de empréstimo..." />
        </section>
      );
    }

    return (
      <section className={`bg-white rounded-2xl shadow-lg p-8 w-full max-w-5xl flex flex-col items-center justify-center transition-all duration-300 ease-in-out ${
        isTransitioning ? 'opacity-0 transform scale-95' : 'opacity-100 transform scale-100'
      }`}>
        <form className="w-full space-y-6">
          <fieldset className="border border-blue-200 rounded-xl p-4 mb-4 bg-blue-50">
            <legend className="text-blue-900 font-semibold px-2">Informações do Empréstimo</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <SelectInput
                options={amortizacaoOptions.options}
                value={emprestimo.amortizacao?.Id || ''}
                onChange={opt => {
                  limparErroEmprestimo('amortizacao');
                  setEmprestimo(e => ({ ...e, amortizacao: { Id: opt.Id, Name: opt.Name } }));
                  localStorage.setItem(EMPRESTIMO_STORAGE_KEY, JSON.stringify({ ...emprestimo, amortizacao: { Id: opt.Id, Name: opt.Name } }));
                }}
                label="Amortização Escolhida"
                placeholder="Selecione entre PRICE e SAC"
                error={errosEmprestimo.amortizacao}
                tooltip="Selecione o tipo de amortização do empréstimo (PRICE ou SAC)"
              />
              <SelectInput
                options={carenciaOptions.options?.filter(option => {
                  // Filtrar apenas opções de 1 a 3 meses
                  const meses = parseInt(option.Name);
                  return !isNaN(meses) && meses >= 1 && meses <= 3;
                }) || []}
                value={emprestimo.carencia?.Id || ''}
                onChange={opt => {
                  limparErroEmprestimo('carencia');
                  setEmprestimo(e => ({ ...e, carencia: { Id: opt.Id, Name: opt.Name } }));
                  localStorage.setItem(EMPRESTIMO_STORAGE_KEY, JSON.stringify({ ...emprestimo, carencia: { Id: opt.Id, Name: opt.Name } }));
                }}
                label="Carência"
                placeholder="Selecione Carência Solicitada (1-3 meses)"
                error={errosEmprestimo.carencia}
                tooltip="Selecione se deseja carência para pagamento do empréstimo (máximo 3 meses)"
              />
              <div className="relative">
                <InputText
                  inputName="Valor Solicitado"
                  termo={emprestimo.valorSolicitado}
                  onSetName={v => {
                    limparErroEmprestimo('valorSolicitado');
                    setEmprestimo(e => ({ ...e, valorSolicitado: v }));
                    verificarValorIRPF(v);
                  }}
                  placeholder="Informe o Valor Solicitado (R$ 75.000,00 - 5.000.000,00)"
                  typeInput="Money"
                  minValue={75000}
                  maxValue={5000000}
                  error={errosEmprestimo.valorSolicitado}
                  tooltip="Digite o valor total do empréstimo que você deseja solicitar (mínimo: R$ 75.000,00, máximo: R$ 5.000.000,00)"
                />
                {/* Aviso de validação em tempo real */}
                {emprestimo.valorSolicitado && !validarValorSolicitado(emprestimo.valorSolicitado) && (
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-yellow-800 text-sm font-medium">
                        O valor deve estar entre R$ 75.000,00 e R$ 5.000.000,00
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div className="relative">
                <InputText
                  inputName="Juros Solicitado"
                  termo={emprestimo.jurosSolicitado}
                  onSetName={v => {
                    limparErroEmprestimo('jurosSolicitado');
                    setEmprestimo(e => ({ ...e, jurosSolicitado: v }));
                  }}
                  placeholder="Juros da operação (1,19% - 2,00%)"
                  typeInput="Juros"
                  minJuros={1.19}
                  maxJuros={2.00}
                  error={errosEmprestimo.jurosSolicitado}
                  tooltip="Digite a taxa de juros anual desejada para o empréstimo (mínimo: 1,19%, máximo: 2,00%)"
                />
                {/* Aviso de validação em tempo real */}
                {emprestimo.jurosSolicitado && !validarJurosSolicitado(emprestimo.jurosSolicitado) && (
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-yellow-800 text-sm font-medium">
                        A taxa de juros deve estar entre 1,19% e 2,00%
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Componente de Seleção de Parcelas */}
              <div className="relative sm:col-span-2">
                <div className="flex items-center justify-between p-4">
                  <h3 className="text-lg font-semibold text-green-600 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Em quantas parcelas?
                  </h3>
                  <div className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
                    {obterOpcaoSelecionada().label}
                  </div>
                </div>
                
                <div className="space-y-4">
                  {/* Slider */}
                  <div className="relative">
                    <div className="relative h-2 bg-gray-200 rounded-full">
                      <div 
                        className="absolute top-0 left-0 h-full bg-green-500 rounded-full transition-all duration-300 ease-in-out"
                        style={{ 
                          width: `${(obterIndiceSelecionado() / (opcoesParcelas.length - 1)) * 100}%` 
                        }}
                      />
                      <input
                        type="range"
                        min="0"
                        max={opcoesParcelas.length - 1}
                        value={obterIndiceSelecionado()}
                        onChange={(e) => {
                          const indice = parseInt(e.target.value);
                          const novaOpcao = opcoesParcelas[indice];
                          atualizarPrazoSolicitado(novaOpcao.value);
                        }}
                        className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div 
                        className="absolute top-1/2 transform -translate-y-1/2 w-6 h-6 bg-green-500 rounded-full border-2 border-white shadow-lg transition-all duration-300 ease-in-out"
                        style={{ 
                          left: `calc(${(obterIndiceSelecionado() / (opcoesParcelas.length - 1)) * 100}% - 12px)` 
                        }}
                      />
                    </div>
                    
                    {/* Marcadores de valores */}
                    <div className="flex justify-between mt-4 text-sm text-red-700">
                      {opcoesParcelas.map((opcao, index) => (
                        <span 
                          key={opcao.value}
                          className={`text-center font-medium ${
                            index === obterIndiceSelecionado() ? 'text-green-600' : 'text-gray-600'
                          }`}
                          style={{ width: `${100 / opcoesParcelas.length}%` }}
                        >
                          {opcao.value === 1 ? '1' : opcao.value}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Aviso de erro */}
                {errosEmprestimo.prazoSolicitado && (
                  <div className="text-red-600 text-sm mt-2">
                    {errosEmprestimo.prazoSolicitado}
                  </div>
                )}
              </div>
              
              <div className="relative sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-blue-900">Renda Total</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-blue-400 cursor-help text-sm hover:text-blue-600 transition-colors">ⓘ</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Soma automática das rendas totais de todos os tomadores da operação</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                  <input
                    value={emprestimo.rendaTotal}
                    onChange={() => {}} // Campo bloqueado, não permite edição
                    placeholder="Renda total (calculada automaticamente)"
                    className="relative w-full px-4 py-4 rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 text-gray-800 font-bold text-xl shadow-lg cursor-not-allowed transition-all duration-300 hover:shadow-xl"
                    disabled={true}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                    <div className="flex items-center gap-2 text-blue-600 bg-white/80 backdrop-blur-sm rounded-full px-3 py-1 shadow-sm">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-xs font-semibold">Calculado</span>
                    </div>
                  </div>
                </div>
                {errosEmprestimo.rendaTotal && (
                  <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errosEmprestimo.rendaTotal}
                  </div>
                )}
                <div className="mt-3 text-sm text-blue-700 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3 shadow-sm">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-blue-800 mb-1">Soma Automática das Rendas</p>
                    <p className="text-blue-600 text-xs leading-relaxed">Este valor é calculado automaticamente somando as rendas totais de todos os tomadores cadastrados na operação.</p>
                  </div>
                </div>
              </div>
            </div>
          </fieldset>
          <fieldset className="border border-blue-200 rounded-xl p-4 mb-4 bg-blue-50">
            <legend className="text-blue-900 font-semibold px-2">Motivo e Defesa do Crédito</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-blue-900 mb-1">Importância da Defesa do Crédito</h4>
                      <p className="text-sm text-blue-700">
                        Esta etapa é fundamental para a análise do seu empréstimo. Descreva detalhadamente o motivo, 
                        justificativa e como o crédito será utilizado. Quanto mais detalhada e convincente for sua 
                        defesa, maiores são as chances de aprovação.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col w-full">
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-sm font-medium text-blue-900">Defesa do Crédito *</label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-blue-400 cursor-help text-sm hover:text-blue-600 transition-colors">ⓘ</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Descreva detalhadamente o motivo do empréstimo, justificativa e como o valor será utilizado</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <textarea
                    value={emprestimo.comentarios}
                    onChange={(e) => {
                      limparErroEmprestimo('comentarios');
                      setEmprestimo(prev => ({ ...prev, comentarios: e.target.value }));
                    }}
                    placeholder="Descreva detalhadamente o motivo do empréstimo, sua justificativa e como o valor será utilizado. Seja específico e convincente para aumentar as chances de aprovação..."
                    className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 resize-none ${
                      errosEmprestimo.comentarios 
                        ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200' 
                        : 'border-gray-300 bg-white focus:border-blue-500 focus:ring-blue-200'
                    } focus:outline-none focus:ring-2`}
                    rows={6}
                    maxLength={2000}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <div className="text-xs text-gray-500">
                      Mínimo 50 caracteres • Máximo 2000 caracteres
                    </div>
                    <div className="text-xs text-gray-500">
                      {emprestimo.comentarios?.length || 0}/2000
                    </div>
                  </div>
                  {errosEmprestimo.comentarios && (
                    <div className="mt-1 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
                      {errosEmprestimo.comentarios}
                    </div>
                  )}
                </div>
              </div>
              <SelectInput
                options={motivoEmprestimoOptions.options}
                value={emprestimo.motivoEmprestimo?.Id || ''}
                onChange={opt => {
                  limparErroEmprestimo('motivoEmprestimo');
                  setEmprestimo(e => ({ ...e, motivoEmprestimo: { Id: opt.Id, Name: opt.Name } }));
                  localStorage.setItem(EMPRESTIMO_STORAGE_KEY, JSON.stringify({ ...emprestimo, motivoEmprestimo: { Id: opt.Id, Name: opt.Name } }));
                }}
                label="Motivo do Empréstimo"
                placeholder="Selecione o Motivo do Empréstimo"
                error={errosEmprestimo.motivoEmprestimo}
                tooltip="Selecione o principal motivo para solicitar o empréstimo"
              />
            </div>
          </fieldset>
          <div className="flex w-full justify-between mt-6">
            <button
              className="py-2 px-6 font-medium rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
              type="button"
              onClick={() => {
                setErrosEmprestimo({});
                setMostrarErroEmprestimo(false);
                transitionToEtapa(etapa - 1);
              }}
            >
              Voltar
            </button>
            <button
              className="py-2 px-6 font-medium rounded-full bg-blue-700 text-white hover:bg-blue-800 transition ml-4"
              type="button"
              onClick={() => {
                const validacao = validarEmprestimo(emprestimo);
                if (!validacao.valido) {
                  setErrosEmprestimo(validacao.erros);
                  setMostrarErroEmprestimo(true);
                  return;
                }
                setErrosEmprestimo({});
                setMostrarErroEmprestimo(false);
                setEtapa(etapa + 1);
              }}
            >
              Próxima Etapa
            </button>
          </div>
        </form>
      </section>
    );
  };

  // Renderização da etapa de garantia (formulário preenchível)
  const renderGarantia = () => {
    // Verificar se as opções estão carregando
    if (verificarCarregamentoGarantia()) {
      return (
        <section className={`bg-white rounded-2xl shadow-lg p-8 w-full max-w-5xl flex flex-col items-center justify-center transition-all duration-300 ease-in-out ${
          isTransitioning ? 'opacity-0 transform scale-95' : 'opacity-100 transform scale-100'
        }`}>
          <LoadingStep msg="Carregando opções de garantia..." />
        </section>
      );
    }

    return (
      <section className={`bg-white rounded-2xl shadow-lg p-8 w-full max-w-5xl flex flex-col items-center justify-center transition-all duration-300 ease-in-out ${
        isTransitioning ? 'opacity-0 transform scale-95' : 'opacity-100 transform scale-100'
      }`}>
        <form className="w-full space-y-6">
          <fieldset className="border border-blue-200 rounded-xl p-4 mb-4 bg-blue-50">
            <legend className="text-blue-900 font-semibold px-2">Dados Básicos da Garantia</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <SelectInput
                options={pertenceTomadorOptions.options}
                value={garantia.garantiaPertenceTomador?.Id || ''}
                onChange={opt => {
                  limparErroGarantia('garantiaPertenceTomador');
                  setGarantia(e => ({ ...e, garantiaPertenceTomador: opt }));
                  localStorage.setItem(GARANTIA_STORAGE_KEY, JSON.stringify({ ...garantia, garantiaPertenceTomador: opt }));
                }}
                label="Garantia pertence ao tomador?"
                placeholder="Selecione a opção"
                error={errosGarantia.garantiaPertenceTomador}
                tooltip="Selecione se a garantia pertence ao tomador ou a terceiros"
              />
              <div className="relative">
                <InputText
                  inputName="Valor da Garantia"
                  termo={garantia.valorGarantia}
                  onSetName={v => {
                    limparErroGarantia('valorGarantia');
                    setGarantia(e => ({ ...e, valorGarantia: v }));
                    localStorage.setItem(GARANTIA_STORAGE_KEY, JSON.stringify({ ...garantia, valorGarantia: v }));
                  }}
                  placeholder="Valor da garantia (R$ 250.000,00 - 50.000.000,00)"
                  typeInput="Money"
                  error={errosGarantia.valorGarantia}
                  tooltip="Digite o valor estimado da garantia (imóvel) - mínimo: R$ 250.000,00, máximo: R$ 50.000.000,00"
                  maxValue={50000000}
                />
                {/* Aviso de validação em tempo real */}
                {garantia.valorGarantia && !validarValorGarantia(garantia.valorGarantia) && (
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-yellow-800 text-sm font-medium">
                        O valor deve estar entre R$ 250.000,00 e R$ 50.000.000,00
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectInput
                options={utilizacaoGarantiaOptions.options || []}
                value={garantia.utilizacaoGarantia?.Id || ''}
                onChange={opt => {
                  limparErroGarantia('utilizacaoGarantia');
                  setGarantia(e => ({ ...e, utilizacaoGarantia: opt }));
                  localStorage.setItem(GARANTIA_STORAGE_KEY, JSON.stringify({ ...garantia, utilizacaoGarantia: opt }));
                }}
                label="Qual a utilização da garantia?"
                placeholder="Selecione a opção"
                error={errosGarantia.utilizacaoGarantia}
                tooltip="Selecione qual será a utilização da garantia"
              />
              <SelectInput
                options={tipoGarantiaOptions.options || []}
                value={garantia.tipoGarantia?.Id || ''}
                onChange={opt => {
                  limparErroGarantia('tipoGarantia');
                  setGarantia(e => ({ ...e, tipoGarantia: opt }));
                  localStorage.setItem(GARANTIA_STORAGE_KEY, JSON.stringify({ ...garantia, tipoGarantia: opt }));
                }}
                label="Tipo da garantia"
                placeholder="Selecione a opção"
                error={errosGarantia.tipoGarantia}
                tooltip="Selecione o tipo da garantia"
              />
            </div>
          </fieldset>

          <fieldset className="border border-blue-200 rounded-xl p-4 mb-4 bg-blue-50">
            <legend className="text-blue-900 font-semibold px-2">Localização</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {/* CEP */}
              <div className="flex flex-col gap-2">
                <InputText
                  inputName="CEP da Garantia"
                  termo={garantia.cepGarantia}
                  onSetName={v => {
                    limparErroGarantia('cepGarantia');
                    const cepFormatado = v.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2');
                    setGarantia(e => ({ ...e, cepGarantia: cepFormatado }));
                    localStorage.setItem(GARANTIA_STORAGE_KEY, JSON.stringify({ ...garantia, cepGarantia: cepFormatado }));
                    
                    // Buscar endereço quando CEP estiver completo
                    if (cepFormatado.length === 9) {
                      buscarEnderecoPorCep(cepFormatado);
                    }
                  }}
                  placeholder="00000-000"
                  typeInput="Text"
                  error={errosGarantia.cepGarantia}
                  tooltip="Digite o CEP da garantia para buscar automaticamente o endereço"
                />
                {buscandoCep && (
                  <div className="flex items-center text-blue-600 text-sm">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    Buscando endereço...
              </div>
                )}
              </div>

              {/* Número */}
              <div className="flex flex-col gap-2">
                <InputText
                  inputName="Número da Garantia"
                  termo={garantia.numeroGarantia}
                  onSetName={v => {
                    limparErroGarantia('numeroGarantia');
                    setGarantia(e => ({ ...e, numeroGarantia: v }));
                    localStorage.setItem(GARANTIA_STORAGE_KEY, JSON.stringify({ ...garantia, numeroGarantia: v }));
                  }}
                  placeholder="123"
                  typeInput="Text"
                  error={errosGarantia.numeroGarantia}
                  tooltip="Digite apenas o número da casa/prédio"
                />
              </div>

              {/* Rural/Urbano */}
              <div className="flex flex-col gap-2">
              <SelectInput
                options={ruralUrbanoOptions.options}
                value={garantia.ruralUrbano?.Id || ''}
                onChange={opt => {
                  limparErroGarantia('ruralUrbano');
                  setGarantia(e => ({ ...e, ruralUrbano: opt }));
                  localStorage.setItem(GARANTIA_STORAGE_KEY, JSON.stringify({ ...garantia, ruralUrbano: opt }));
                }}
                label="Selecione Rural ou Urbano"
                placeholder="Selecione a opção"
                error={errosGarantia.ruralUrbano}
                tooltip="Selecione se a garantia está em área rural ou urbana"
              />
              </div>

              {/* Endereço (preenchido automaticamente) */}
              <div className="flex flex-col gap-2">
              <InputText
                inputName="Endereço da Garantia"
                termo={garantia.enderecoGarantia}
                onSetName={v => {
                  limparErroGarantia('enderecoGarantia');
                  setGarantia(e => ({ ...e, enderecoGarantia: v }));
                  localStorage.setItem(GARANTIA_STORAGE_KEY, JSON.stringify({ ...garantia, enderecoGarantia: v }));
                }}
                  placeholder="Rua - Bairro (preenchido automaticamente pelo CEP)"
                typeInput="Text"
                error={errosGarantia.enderecoGarantia}
                  tooltip="Endereço preenchido automaticamente pelo CEP"
                />
              </div>

              {/* Cidade (preenchida automaticamente) */}
              <div className="flex flex-col gap-2">
                <InputText
                  inputName="Cidade da Garantia"
                  termo={garantia.cidadeGarantia?.Name || ''}
                  onSetName={v => {
                    limparErroGarantia('cidadeGarantia');
                    setGarantia(e => ({ ...e, cidadeGarantia: { Id: '', Name: v } }));
                    localStorage.setItem(GARANTIA_STORAGE_KEY, JSON.stringify({ ...garantia, cidadeGarantia: { Id: '', Name: v } }));
                  }}
                  placeholder="Cidade (preenchida automaticamente pelo CEP)"
                  typeInput="Text"
                  error={errosGarantia.cidadeGarantia}
                  tooltip="Cidade preenchida automaticamente pelo CEP"
                />
                
                {/* Exibição da população da cidade */}
                {/* {garantia.cidadeGarantia?.Name && (
                  <CityPopulationDisplay 
                    cityName={garantia.cidadeGarantia.Name} 
                    uf={garantia.unidadeFederativaSigla}
                  />
                )} */}
                
              </div>

              {/* Estado (preenchido automaticamente) */}
              <div className="flex flex-col gap-2">
                <InputText
                  inputName="Estado da Garantia"
                  termo={garantia.unidadeFederativa?.Name || ''}
                  onSetName={v => {
                  limparErroGarantia('unidadeFederativa');
                    setGarantia(e => ({ ...e, unidadeFederativa: { Id: '', Name: v } }));
                    localStorage.setItem(GARANTIA_STORAGE_KEY, JSON.stringify({ ...garantia, unidadeFederativa: { Id: '', Name: v } }));
                }}
                  placeholder="Estado (preenchido automaticamente pelo CEP)"
                  typeInput="Text"
                error={errosGarantia.unidadeFederativa}
                  tooltip="Estado preenchido automaticamente pelo CEP"
              />
              </div>
            </div>
          </fieldset>

          <fieldset className="border border-blue-200 rounded-xl p-4 mb-4 bg-blue-50">
            <legend className="text-blue-900 font-semibold px-2">Situação da Garantia</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <SelectInput
                options={opcoesSimNao}
                value={garantia.situacaoGarantia === true ? 'true' : garantia.situacaoGarantia === false ? 'false' : ''}
                onChange={opt => {
                  limparErroGarantia('situacaoGarantia');
                  const valor = opt && opt.Id ? opt.Id === 'true' : undefined;
                  const valorAnterior = garantia.situacaoGarantia;
                  
                  // Se mudou o valor (de Sim para Não ou vice-versa), limpar campos de financiamento
                  const mudouValor = valor !== valorAnterior;
                  
                  setGarantia(e => {
                    const novaGarantia = { ...e, situacaoGarantia: valor };
                    
                    // Limpar campos de financiamento quando mudar entre Sim e Não
                    if (mudouValor) {
                      novaGarantia.comQuemEstaFinanciada = { Id: '', Name: '' };
                      novaGarantia.valorEmAberto = '';
                      // Também limpar quantasParcelasFalta se existir
                      novaGarantia.quantasParcelasFalta = '';
                    }
                    
                    // Atualizar localStorage com os valores atualizados
                    localStorage.setItem(GARANTIA_STORAGE_KEY, JSON.stringify(novaGarantia));
                    
                    return novaGarantia;
                  });
                }}
                label="Garantia quitada?"
                placeholder="Selecione Sim ou Não"
                error={errosGarantia.situacaoGarantia}
                tooltip="Selecione se a garantia está totalmente quitada ou ainda possui financiamento"
              />
            </div>
          </fieldset>

          {garantia.situacaoGarantia === false && (
            <fieldset className="border border-blue-200 rounded-xl p-4 mb-4 bg-blue-50">
              <legend className="text-blue-900 font-semibold px-2">Financiamento</legend>
              
              {/* Aviso informativo */}
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-yellow-800 font-medium">
                    Atenção: Como a garantia não está quitada, é necessário preencher as informações de financiamento abaixo.
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <SelectInput
                  options={comQuemEstaFinanciadaOptions.options}
                  value={garantia.comQuemEstaFinanciada?.Id || ''}
                  onChange={opt => {
                    limparErroGarantia('comQuemEstaFinanciada');
                    setGarantia(e => ({ ...e, comQuemEstaFinanciada: opt }));
                    localStorage.setItem(GARANTIA_STORAGE_KEY, JSON.stringify({ ...garantia, comQuemEstaFinanciada: opt }));
                  }}
                  label="Com quem a garantia está financiada"
                  placeholder="Selecione a opção"
                  error={errosGarantia.comQuemEstaFinanciada}
                  tooltip="Selecione a instituição financeira que financia a garantia"
                />
                <InputText
                  inputName="Valor em aberto da Garantia"
                  termo={garantia.valorEmAberto || ''}
                  onSetName={v => {
                    limparErroGarantia('valorEmAberto');
                    setGarantia(e => ({ ...e, valorEmAberto: v }));
                    localStorage.setItem(GARANTIA_STORAGE_KEY, JSON.stringify({ ...garantia, valorEmAberto: v }));
                  }}
                  placeholder="Saldo devedor (R$)"
                  typeInput="Money"
                  error={errosGarantia.valorEmAberto}
                  tooltip="Digite o valor que ainda falta pagar do financiamento da garantia"
                />
              </div>
              {/* <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputText
                  inputName="Quantas parcelas faltam"
                  termo={garantia.quantasParcelasFalta || ''}
                  onSetName={v => {
                    limparErroGarantia('quantasParcelasFalta');
                    setGarantia(e => ({ ...e, quantasParcelasFalta: v }));
                    localStorage.setItem(GARANTIA_STORAGE_KEY, JSON.stringify({ ...garantia, quantasParcelasFalta: v }));
                  }}
                  placeholder="Quantas parcelas tem em aberto?"
                  typeInput="Text"
                  error={errosGarantia.quantasParcelasFalta}
                  tooltip="Digite quantas parcelas ainda faltam pagar do financiamento"
                />
              </div> */}
            </fieldset>
          )}

          <fieldset className="border border-blue-200 rounded-xl p-4 mb-4 bg-blue-50">
            <legend className="text-blue-900 font-semibold px-2">Documentação</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <SelectInput
                options={opcoesSimNao}
                value={garantia.escritura === true ? 'true' : garantia.escritura === false ? 'false' : ''}
                onChange={opt => {
                  limparErroGarantia('escritura');
                  const valor = opt && opt.Id ? opt.Id === 'true' : undefined;
                  setGarantia(e => ({ ...e, escritura: valor }));
                  localStorage.setItem(GARANTIA_STORAGE_KEY, JSON.stringify({ ...garantia, escritura: valor }));
                }}
                label="Escritura individual?"
                placeholder="Selecione Sim ou Não"
                error={errosGarantia.escritura}
                tooltip="Selecione se a escritura da garantia é individual ou em condomínio"
              />
              <SelectInput
                options={opcoesSimNao}
                value={garantia.nomeMatrícula === true ? 'true' : garantia.nomeMatrícula === false ? 'false' : ''}
                onChange={opt => {
                  limparErroGarantia('nomeMatrícula');
                  const valor = opt && opt.Id ? opt.Id === 'true' : undefined;
                  setGarantia(e => ({ ...e, nomeMatrícula: valor }));
                  localStorage.setItem(GARANTIA_STORAGE_KEY, JSON.stringify({ ...garantia, nomeMatrícula: valor }));
                }}
                label="Nome está na matrícula?"
                placeholder="Selecione Sim ou Não"
                error={errosGarantia.nomeMatrícula}
                tooltip="Selecione se o nome do proprietário está na matrícula da garantia"
              />
            </div>
          </fieldset>

          <fieldset className="border border-blue-200 rounded-xl p-4 mb-4 bg-blue-50">
            <legend className="text-blue-900 font-semibold px-2">Situações Especiais</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <SelectInput
                options={opcoesSimNao}
                value={garantia.imovelAverbado === true ? 'true' : garantia.imovelAverbado === false ? 'false' : ''}
                onChange={opt => {
                  limparErroGarantia('imovelAverbado');
                  const valor = opt && opt.Id ? opt.Id === 'true' : undefined;
                  setGarantia(e => ({ ...e, imovelAverbado: valor }));
                  localStorage.setItem(GARANTIA_STORAGE_KEY, JSON.stringify({ ...garantia, imovelAverbado: valor }));
                }}
                label="Imóvel averbado?"
                placeholder="Selecione Sim ou Não"
                error={errosGarantia.imovelAverbado}
                tooltip="Selecione se o imóvel possui averbações (restrições) no registro"
              />
              <SelectInput
                options={opcoesSimNao}
                value={garantia.possuiUsufruto === true ? 'true' : garantia.possuiUsufruto === false ? 'false' : ''}
                onChange={opt => {
                  limparErroGarantia('possuiUsufruto');
                  const valor = opt && opt.Id ? opt.Id === 'true' : undefined;
                  setGarantia(e => ({ ...e, possuiUsufruto: valor }));
                  localStorage.setItem(GARANTIA_STORAGE_KEY, JSON.stringify({ ...garantia, possuiUsufruto: valor }));
                }}
                label="Possui usufruto?"
                placeholder="Selecione Sim ou Não"
                error={errosGarantia.possuiUsufruto}
                tooltip="Selecione se o imóvel possui usufruto registrado"
              />
              <SelectInput
                options={opcoesSimNao}
                value={garantia.processoInventario === true ? 'true' : garantia.processoInventario === false ? 'false' : ''}
                onChange={opt => {
                  limparErroGarantia('processoInventario');
                  const valor = opt && opt.Id ? opt.Id === 'true' : undefined;
                  setGarantia(e => ({ ...e, processoInventario: valor }));
                  localStorage.setItem(GARANTIA_STORAGE_KEY, JSON.stringify({ ...garantia, processoInventario: valor }));
                }}
                label="Processo de inventário?"
                placeholder="Selecione Sim ou Não"
                error={errosGarantia.processoInventario}
                tooltip="Selecione se existe processo de inventário envolvendo o imóvel"
              />
            </div>
          </fieldset>

          <fieldset className="border border-blue-200 rounded-xl p-4 mb-4 bg-blue-50">
            <legend className="text-blue-900 font-semibold px-2">Dívidas</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {garantia.ruralUrbano?.Name === 'Urbano' ? (
                <>
                  <SelectInput
                    options={opcoesSimNao}
                    value={garantia.dividaCondominio === true ? 'true' : garantia.dividaCondominio === false ? 'false' : ''}
                    onChange={opt => {
                      limparErroGarantia('dividaCondominio');
                      const valor = opt && opt.Id ? opt.Id === 'true' : undefined;
                      setGarantia(e => ({ ...e, dividaCondominio: valor }));
                      localStorage.setItem(GARANTIA_STORAGE_KEY, JSON.stringify({ ...garantia, dividaCondominio: valor }));
                    }}
                    label="Dívida de condomínio"
                    placeholder="Selecione Sim ou Não"
                    error={errosGarantia.dividaCondominio}
                    tooltip="Selecione se existem dívidas de condomínio em aberto"
                  />
                  <SelectInput
                    options={opcoesSimNao}
                    value={garantia.dividaIPTU === true ? 'true' : garantia.dividaIPTU === false ? 'false' : ''}
                    onChange={opt => {
                      limparErroGarantia('dividaIPTU');
                      const valor = opt && opt.Id ? opt.Id === 'true' : undefined;
                      setGarantia(e => ({ ...e, dividaIPTU: valor }));
                      localStorage.setItem(GARANTIA_STORAGE_KEY, JSON.stringify({ ...garantia, dividaIPTU: valor }));
                    }}
                    label="Dívida de IPTU"
                    placeholder="Selecione Sim ou Não"
                    error={errosGarantia.dividaIPTU}
                    tooltip="Selecione se existem dívidas de IPTU em aberto"
                  />
                </>
              ) : garantia.ruralUrbano?.Name === 'Rural' ? (
                <SelectInput
                  options={dividaITROptions.options}
                  value={garantia.dividaITR?.Id || ''}
                  onChange={opt => {
                    limparErroGarantia('dividaITR');
                    setGarantia(e => ({ ...e, dividaITR: opt }));
                    localStorage.setItem(GARANTIA_STORAGE_KEY, JSON.stringify({ ...garantia, dividaITR: opt }));
                  }}
                  label="Dívida de ITR"
                  placeholder="Selecione a opção"
                  error={errosGarantia.dividaITR}
                  tooltip="Selecione se existem dívidas de ITR (Imposto Territorial Rural) em aberto"
                />
              ) : (
                <div className="col-span-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-gray-600 text-sm">
                    Selecione se o imóvel é Rural ou Urbano para exibir os campos de dívidas correspondentes.
                  </p>
                </div>
              )}
            </div>
          </fieldset>

          {/* Cálculo de LTV */}
          {garantia.valorGarantia && garantia.tipoGarantia && (
              <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl">
                <h4 className="font-semibold text-green-800 mb-3">📊 Cálculo de Valor Máximo Permitido</h4>
                {(() => {
                  // Nova regra: valor solicitado não pode ser maior que 50% do valor do imóvel
                  const valorMaximoPermitido = (valorImovelNumerico * 50) / 100;
                  const valorExcedeLimite = verificarValorExcedeCredito();
                  
                  return (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm font-medium text-gray-600">Valor do Imóvel:</span>
                          <p className="font-semibold text-lg">{garantia.valorGarantia}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-600">Percentual Máximo:</span>
                          <p className="font-bold text-lg text-green-600">
                            50%
                          </p>
                        </div>
                      </div>
                  
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-600">Valor máximo disponível para este imóvel:</span>
                          <span className="font-bold text-xl text-blue-800">
                            R$ {valorMaximoPermitido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                      
                      {/* Valor Solicitado */}
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-600">Valor Solicitado:</span>
                          <span className={`font-bold text-xl ${valorExcedeLimite ? 'text-red-600' : 'text-gray-800'}`}>
                            {emprestimo.valorSolicitado || 'R$ 0,00'}
                          </span>
                        </div>
                      </div>

                      {/* Banner de aviso apenas quando a regra de 50% for quebrada */}
                      {valorExcedeLimite && (
                        <div className="p-3 rounded-lg border-l-4 bg-orange-50 border-orange-400">
                          <div className="flex items-start">
                            <svg className="w-5 h-5 mr-2 mt-0.5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <div>
                              <p className="text-sm font-medium text-orange-800">
                                Valor Excede Limite
                              </p>
                              <p className="text-sm text-orange-700">
                                O valor solicitado (R$ {valorSolicitadoNumerico.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) excede o valor máximo permitido (R$ {valorMaximoPermitido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}).
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Regra única - mostrar apenas quando a regra for quebrada */}
                      {valorExcedeLimite && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                          <h5 className="font-semibold text-gray-700 mb-2">Regra:</h5>
                          <ul className="text-sm text-gray-600 space-y-1">
                            <li>• O valor solicitado não pode ser maior que 50% do valor do imóvel</li>
                          </ul>
                        </div>
                      )}
                      
                    </div>
                  );
                })()}
              </div>
            )}

          <div className="flex w-full justify-between mt-6">
            <button
              className="py-2 px-6 font-medium rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
              type="button"
              onClick={() => {
                setErrosGarantia({});
                setMostrarErroGarantia(false);
                transitionToEtapa(etapa - 1);
              }}
            >
              Voltar
            </button>
            
            {/* Botão adicional para voltar ao empréstimo quando valor excede limite */}
            {verificarValorExcedeCredito() && (
              <button
                className="py-2 px-6 font-medium rounded-full bg-orange-600 text-white hover:bg-orange-700 transition mr-4"
                type="button"
                onClick={() => {
                  // Voltar para a aba de empréstimo (etapa anterior)
                  transitionToEtapa((quantidade || 0) + 1);
                }}
              >
                🔄 Ajustar Valor Solicitado
              </button>
            )}
            
            <button
              className={`py-2 px-6 font-medium rounded-full transition ml-4 ${
                verificarValorExcedeCredito() 
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                  : 'bg-blue-700 text-white hover:bg-blue-800'
              }`}
              type="button"
              disabled={verificarValorExcedeCredito()}
              onClick={() => {
                if (verificarValorExcedeCredito()) return;
                
                const validacao = validarGarantia(garantia);
                if (!validacao.valido) {
                  setErrosGarantia(validacao.erros);
                  setMostrarErroGarantia(true);
                  return;
                }
                setErrosGarantia({});
                setMostrarErroGarantia(false);
                
                if (garantia.garantiaPertenceTomador?.Name === 'Imóvel de terceiro') {
                  setShowGarantidorModal(true);
                } else {
                  // Finalizar cadastro
                  enviarDadosParaBackend();
                }
              }}
            >
              {verificarValorExcedeCredito() ? 'Valor Excede Limite' : 'Finalizar Cadastro'}
            </button>
          </div>
        </form>
      </section>
    );
  };

  // Modal de aviso para garantidores
  const renderGarantidorModal = () => (
    <div className="fixed z-50 inset-0 flex items-center justify-center">
      <div className="fixed inset-0 bg-black opacity-30" />
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-md mx-auto z-50 flex flex-col items-center relative">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-blue-600 text-2xl font-bold">⚠️</span>
        </div>
        <h2 className="text-xl font-bold mb-2">Atenção!</h2>
        <p className="text-gray-700 mb-6 text-center">Como o imóvel é de terceiros, é necessário cadastrar os garantidores da operação.</p>
        <div className="flex w-full justify-between mt-2">
          <button
            className="flex-1 py-2 font-medium rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition transform hover:scale-105 mr-4"
            onClick={() => {
              setShowGarantidorModal(false);
            }}
          >
            Cancelar
          </button>
          <button
            className="flex-1 py-2 font-medium rounded-full bg-blue-700 text-white hover:bg-blue-800 transition transform hover:scale-105"
            onClick={() => {
              setShowGarantidorModal(false);
              setShowQtdGarantidores(true);
              setEtapa((quantidade || 0) + 3);
            }}
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );

  // Etapa para escolher quantidade de garantidores
  const renderQtdGarantidores = () => (
    <section className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md space-y-6 flex flex-col items-center">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">1. Quantidade de Garantidores</h2>
      <div className="w-full flex flex-col items-center">
        <label className="block mb-2 font-medium">Selecione a quantidade de garantidores</label>
        <SelectInput
          options={quantidadeGarantidoresOptions}
          value={qtdGarantidoresId ? String(qtdGarantidoresId) : undefined}
          onChange={opt => {
            if (opt) {
              const qtd = Number(opt.Name);
              setQtdGarantidores(qtd);
              setQtdGarantidoresId(opt.Id);
              setGarantidores(Array.from({ length: qtd }, () => ({ ...initialGarantidor })));
              localStorage.setItem(QUANTIDADE_GARANTIDORES_STORAGE_KEY, JSON.stringify({ Id: opt.Id, Name: opt.Name }));
            }
          }}
          label="Quantidade de Garantidores"
          placeholder="Selecione a quantidade"
          tooltip="Selecione quantos garantidores participarão do empréstimo (1 a 4)"
        />
      </div>
      <button
        className="w-full py-3 font-semibold rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition transform hover:scale-105 disabled:opacity-50 mt-6"
        onClick={() => {
          setShowQtdGarantidores(false);
          transitionToEtapa((quantidade || 0) + 4);
        }}
        disabled={!qtdGarantidoresId}
      >
        Continuar
      </button>
    </section>
  );

  // Formulário de garantidores
  const renderGarantidores = () => {
    // O índice do garantidor atual é etapa - ((quantidade || 0) + 4)
    const idx = etapa - ((quantidade || 0) + 4);
    const garantidor = garantidores[idx] || { ...initialGarantidor };

    // Verificar se as opções estão carregando
    if (verificarCarregamentoGarantidores()) {
      return (
        <section className={`bg-white rounded-2xl shadow-lg p-8 w-full max-w-5xl flex flex-col items-center justify-center transition-all duration-300 ease-in-out ${
          isTransitioning ? 'opacity-0 transform scale-95' : 'opacity-100 transform scale-100'
        }`}>
          <LoadingStep msg="Carregando opções de garantidores..." />
        </section>
      );
    }

    const estadoCivilOptions = estadoCivilGarantidoresOptionsArr[idx];
    const tipoPessoaGarantidoresOptions = tipoPessoaOptionsGarantidorArr[idx];


    return (
      <section className={`bg-white rounded-2xl shadow-lg p-8 w-full max-w-5xl flex flex-col items-center justify-center transition-all duration-300 ease-in-out ${
        isTransitioning ? 'opacity-0 transform scale-95' : 'opacity-100 transform scale-100'
      }`}>
        <h2 className="text-lg font-bold text-blue-900 mb-4">Garantidor {idx + 1}</h2>
        <form className="w-full space-y-6">
          {/* Tipo de Pessoa */}
          <fieldset className="border border-blue-200 rounded-xl p-4 mb-2">
            <legend className="text-blue-900 font-semibold px-2">Tipo de Pessoa - Garantidor</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              <SelectInput
                options={tipoPessoaGarantidoresOptions?.options || []}
                value={garantidor.tipoPessoa.Id ? String(garantidor.tipoPessoa.Id) : undefined}
                onChange={opt => {
                  limparErroGarantidores('tipoPessoa');
                  const novoTipoPessoa = opt.Name?.toLowerCase().trim();
                  const tipoPessoaAnterior = garantidor.tipoPessoa?.Name?.toLowerCase().trim() || '';
                  
                  // Verificar se realmente mudou o tipo
                  const mudouParaPJ = novoTipoPessoa === 'pessoa jurídica' && tipoPessoaAnterior !== 'pessoa jurídica';
                  const mudouParaPF = novoTipoPessoa === 'pessoa física' && tipoPessoaAnterior !== 'pessoa física';
                  
                  setGarantidores(prev => {
                    const novo = [...prev];
                    const garantidorAtual = { ...novo[idx] };
                    
                    // Se mudou de Pessoa Física para Pessoa Jurídica, limpar campos específicos de PF
                    if (mudouParaPJ) {
                      garantidorAtual.estadoCivil = { Id: '', Name: '' };
                      garantidorAtual.cpf = '';
                      garantidorAtual.profissao = '';
                      garantidorAtual.temEmpresa = { Id: '', Name: '' };
                      garantidorAtual.grauParentesco = { Id: '', Name: '' };
                    }
                    
                    // Se mudou de Pessoa Jurídica para Pessoa Física, limpar campos específicos de PJ
                    if (mudouParaPF) {
                      garantidorAtual.cnpj = '';
                    }
                    
                    novo[idx] = { ...garantidorAtual, tipoPessoa: { Id: opt.Id, Name: opt.Name } };
                    return novo;
                  });
                  // Salvar no localStorage
                  localStorage.setItem(`garantidor_${idx}_tipoPessoa`, JSON.stringify({ Id: opt.Id, Name: opt.Name }));
                }}
                label="Tipo de Pessoa"
                placeholder="Selecione o tipo de pessoa"
                error={errosGarantidores.tipoPessoa}
                tooltip="Selecione se é pessoa física ou pessoa jurídica"
              />
            </div>
          </fieldset>

          {/* Campos condicionais baseados no tipo de pessoa */}
          {garantidor.tipoPessoa?.Name?.toLowerCase() === 'pessoa física' && (
            <>
              {/* Dados Pessoais */}
              <fieldset className="border border-blue-200 rounded-xl p-4 mb-2">
                <legend className="text-blue-900 font-semibold px-2">Dados Pessoais</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              <SelectInput
                options={estadoCivilOptions.options}
                value={garantidor.estadoCivil.Id ? String(garantidor.estadoCivil.Id) : undefined}
                onChange={opt => {
                  limparErroGarantidores('estadoCivil');
                  setGarantidores(prev => {
                    const novo = [...prev];
                    novo[idx] = { ...novo[idx], estadoCivil: { Id: opt.Id, Name: opt.Name } };
                    return novo;
                  });
                }}
                label="Estado Civil"
                placeholder="Selecione o estado civil"
                error={errosGarantidores.estadoCivil}
                tooltip="Selecione o estado civil do garantidor"
              />
              <InputText
                inputName="Nome"
                termo={garantidor.nome}
                onSetName={v => {
                  limparErroGarantidores('nome');
                  setGarantidores(prev => { const novo = [...prev]; novo[idx] = { ...novo[idx], nome: v }; return novo; });
                }}
                placeholder="Digite o nome"
                typeInput="Text"
                error={errosGarantidores.nome}
                tooltip="Digite o nome completo do garantidor"
              />
              <InputText
                inputName="CPF"
                termo={garantidor.cpf}
                onSetName={v => {
                  limparErroGarantidores('cpf');
                  setGarantidores(prev => { const novo = [...prev]; novo[idx] = { ...novo[idx], cpf: v }; return novo; });
                }}
                placeholder="Digite o CPF"
                typeInput="Cpf"
                error={errosGarantidores.cpf}
                tooltip="Digite o CPF do garantidor"
              />
            </div>
          </fieldset>

          {/* Profissional */}
          <fieldset className="border border-blue-200 rounded-xl p-4 mb-4">
            <legend className="text-blue-900 font-semibold px-2">Profissional</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectInput
                options={[
                  { Id: '1', Name: 'Sim' },
                  { Id: '2', Name: 'Não' }
                ]}
                value={garantidor.temEmpresa.Id ? String(garantidor.temEmpresa.Id) : undefined}
                onChange={opt => {
                  limparErroGarantidores('temEmpresa');
                  setGarantidores(prev => {
                    const novo = [...prev];
                    novo[idx] = { ...novo[idx], temEmpresa: { Id: opt.Id, Name: opt.Name } };
                    return novo;
                  });
                }}
                label="Garantidor tem empresa?"
                placeholder="Selecione uma opção"
                error={errosGarantidores.temEmpresa}
                tooltip="Informe se o garantidor possui empresa própria"
              />
              <InputText
                inputName="Email"
                termo={garantidor.email}
                onSetName={v => {
                  limparErroGarantidores('email');
                  setGarantidores(prev => { const novo = [...prev]; novo[idx] = { ...novo[idx], email: v }; return novo; });
                }}
                placeholder="Digite o email"
                typeInput="Text"
                error={errosGarantidores.email}
                tooltip="Digite o email do garantidor"
              />
            </div>
          </fieldset>

              {/* Informações Adicionais para Pessoa Física */}
              <fieldset className="border border-blue-200 rounded-xl p-4 mb-4">
                <legend className="text-blue-900 font-semibold px-2">Informações Adicionais</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Quando NÃO tem empresa: CPF e Profissão */}
                  {garantidor.temEmpresa?.Name?.toLowerCase() === 'não' && (
                    <>
                      <InputText
                        inputName="Profissão"
                        termo={garantidor.profissao}
                        onSetName={v => {
                          limparErroGarantidores('profissao');
                          setGarantidores(prev => { const novo = [...prev]; novo[idx] = { ...novo[idx], profissao: v }; return novo; });
                        }}
                        placeholder="Digite a profissão"
                        typeInput="Text"
                        error={errosGarantidores.profissao}
                        tooltip="Digite a profissão do garantidor"
                      />
                    </>
                  )}
                  {/* Quando TEM empresa: CNPJ e Razão Social */}
                  {garantidor.temEmpresa?.Name?.toLowerCase() === 'sim' && (
                    <>
                      <InputText
                        inputName="CNPJ"
                        termo={garantidor.cnpj}
                        onSetName={v => {
                          limparErroGarantidores('cnpj');
                          setGarantidores(prev => { const novo = [...prev]; novo[idx] = { ...novo[idx], cnpj: v }; return novo; });
                        }}
                        placeholder="Digite o CNPJ"
                        typeInput="Cnpj"
                        error={errosGarantidores.cnpj}
                        tooltip="Digite o CNPJ do garantidor"
                      />
                      <InputText
                        inputName="Razão Social"
                        termo={garantidor.profissao}
                        onSetName={v => {
                          limparErroGarantidores('profissao');
                          setGarantidores(prev => { const novo = [...prev]; novo[idx] = { ...novo[idx], profissao: v }; return novo; });
                        }}
                        placeholder="Digite a razão social"
                        typeInput="Text"
                        error={errosGarantidores.profissao}
                        tooltip="Digite a razão social da empresa do garantidor"
                      />
                    </>
                  )}
                </div>
              </fieldset>
            </>
          )}

          {/* Campos para Pessoa Jurídica */}
          {garantidor.tipoPessoa?.Name?.toLowerCase() === 'pessoa jurídica' && (
            <>
              {/* Dados da Empresa */}
              <fieldset className="border border-blue-200 rounded-xl p-4 mb-4">
                <legend className="text-blue-900 font-semibold px-2">Dados da Empresa</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <>
                      <InputText
                        inputName="CNPJ"
                        termo={garantidor.cnpj}
                        onSetName={v => {
                          limparErroGarantidores('cnpj');
                          setGarantidores(prev => { const novo = [...prev]; novo[idx] = { ...novo[idx], cnpj: v }; return novo; });
                        }}
                        placeholder="Digite o CNPJ"
                        typeInput="Cnpj"
                        error={errosGarantidores.cnpj}
                        tooltip="Digite o CNPJ do garantidor"
                      />
                      <InputText
                        inputName="Razão Social"
                        termo={garantidor.nome}
                        onSetName={v => {
                          limparErroGarantidores('nome');
                          setGarantidores(prev => { const novo = [...prev]; novo[idx] = { ...novo[idx], nome: v }; return novo; });
                        }}
                        placeholder="Digite a Razão Social"
                        typeInput="Text"
                        error={errosGarantidores.nome}
                        tooltip="Digite a razão social da empresa do garantidor"
                      />

                    <InputText
                      inputName="Email"
                      termo={garantidor.email}
                      onSetName={v => {
                        limparErroGarantidores('email');
                        setGarantidores(prev => { const novo = [...prev]; novo[idx] = { ...novo[idx], email: v }; return novo; });
                      }}
                      placeholder="Digite o email"
                      typeInput="Text"
                      error={errosGarantidores.email}
                      tooltip="Digite o email do garantidor"
                    />

                    </>
                  {/* <InputText
                    inputName="CNPJ"
                    termo={garantidor.cnpj}
                    onSetName={v => {
                      limparErroGarantidores('cnpj');
                      setGarantidores(prev => { const novo = [...prev]; novo[idx] = { ...novo[idx], cnpj: v }; return novo; });
                    }}
                    placeholder="Digite o CNPJ"
                    typeInput="CNPJ"
                    error={errosGarantidores.cnpj}
                  />
                  
                  <InputText
                    inputName="Razão Social"
                    termo={garantidor.profissao}
                    onSetName={v => {
                      limparErroGarantidores('profissao');
                      setGarantidores(prev => { const novo = [...prev]; novo[idx] = { ...novo[idx], profissao: v }; return novo; });
                    }}
                    placeholder="Digite a razão social"
                    typeInput="Text"
                    error={errosGarantidores.profissao}
                  /> */}
                  
                  {/* <InputText
                    inputName="Email"
                    termo={garantidor.email}
                    onSetName={v => {
                      limparErroGarantidores('email');
                      setGarantidores(prev => { const novo = [...prev]; novo[idx] = { ...novo[idx], email: v }; return novo; });
                    }}
                    placeholder="Digite o email"
                    typeInput="Email"
                    error={errosGarantidores.email}
                  /> */}
                </div>
              </fieldset>
            </>
          )}

          {/* Botões de navegação */}
          <div className="flex w-full justify-between mt-6">
            <button
              className="py-2 px-6 font-medium rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
              type="button"
              onClick={() => {
                setErrosGarantidores({});
                setMostrarErroGarantidores(false);
                transitionToEtapa(etapa - 1);
              }}
            >
              Voltar
            </button>
            <button
              className="py-2 px-6 font-medium rounded-full bg-blue-700 text-white hover:bg-blue-800 transition ml-4"
              type="button"
              onClick={() => {
                const garantidorAtual = garantidores[idx] || { ...initialGarantidor };
                const validacao = validarGarantidor(garantidorAtual);
                
                if (!validacao.valido) {
                  setErrosGarantidores(validacao.erros);
                  setMostrarErroGarantidores(true);
                  return;
                }
                setErrosGarantidores({});
                setMostrarErroGarantidores(false);
                
                // Se a próxima etapa ainda for um garantidor, usar transição suave
                if (idx + 1 < qtdGarantidores) {
                  transitionToEtapa(etapa + 1);
                } else {
                  // Ir para etapa de grau de parentesco
                  transitionToEtapa(etapa + 1);
                }
              }}
            >
              {idx + 1 < qtdGarantidores ? 'Próximo Garantidor' : 'Próxima Etapa'}
            </button>
          </div>
        </form>
      </section>
    );
  };

  // Etapa de grau de parentesco
  const renderGrauParentesco = () => {
    // Verificar se as opções estão carregando
    if (grauParentescoOptions.loading) {
      return (
        <section className={`bg-white rounded-2xl shadow-lg p-8 w-full max-w-5xl flex flex-col items-center justify-center transition-all duration-300 ease-in-out ${
          isTransitioning ? 'opacity-0 transform scale-95' : 'opacity-100 transform scale-100'
        }`}>
          <LoadingStep msg="Carregando opções de grau de parentesco..." />
        </section>
      );
    }

    // Pegar o último garantidor para definir o grau de parentesco
    const ultimoGarantidor = garantidores[qtdGarantidores - 1] || { ...initialGarantidor };

    return (
      <section className={`bg-white rounded-2xl shadow-lg p-8 w-full max-w-3xl flex flex-col items-center justify-center transition-all duration-300 ease-in-out ${
        isTransitioning ? 'opacity-0 transform scale-95' : 'opacity-100 transform scale-100'
      }`}>
        <div className="w-full max-w-2xl space-y-6">
          {/* Header com explicação */}
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-blue-900">Grau de Parentesco</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg mt-1">
                  <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-blue-800 mb-2">Por que precisamos desta informação?</h3>
                  <div className="space-y-2 text-sm text-blue-700">
                    <p>O grau de parentesco entre o garantidor e o tomador da operação é uma informação:</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Campo de seleção */}
          <div className="space-y-4">
            <div className="w-full max-w-md mx-auto">
              <SelectInput
                options={grauParentescoOptions.options || []}
                value={ultimoGarantidor.grauParentesco.Id ? String(ultimoGarantidor.grauParentesco.Id) : undefined}
                onChange={opt => {
                  limparErroGarantidores('grauParentesco');
                  setGarantidores(prev => {
                    const novo = [...prev];
                    novo[qtdGarantidores - 1] = { 
                      ...novo[qtdGarantidores - 1], 
                      grauParentesco: { Id: opt.Id, Name: opt.Name } 
                    };
                    return novo;
                  });
                }}
                label="Grau de Parentesco"
                placeholder="Selecione o grau de parentesco"
                error={errosGarantidores.grauParentesco}
                tooltip="Selecione o grau de parentesco do garantidor com o tomador da operação"
              />
            </div>
          </div>

          {/* Botões de navegação */}
          <div className="flex w-full justify-between mt-8">
            <button
              className="py-2 px-6 font-medium rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
              type="button"
              onClick={() => {
                setErrosGarantidores({});
                setMostrarErroGarantidores(false);
                transitionToEtapa(etapa - 1);
              }}
            >
              Voltar
            </button>
            
            {/* Botão adicional para voltar ao empréstimo quando valor excede limite */}
            {verificarValorExcedeCredito() && (
              <button
                className="py-2 px-6 font-medium rounded-full bg-orange-600 text-white hover:bg-orange-700 transition mr-4"
                type="button"
                onClick={() => {
                  // Voltar para a aba de empréstimo (etapa anterior)
                  transitionToEtapa((quantidade || 0) + 1);
                }}
              >
                🔄 Ajustar Valor Solicitado
              </button>
            )}
            
            <button
              className={`py-2 px-6 font-medium rounded-full transition ml-4 ${
                verificarValorExcedeCredito() 
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                  : 'bg-blue-700 text-white hover:bg-blue-800'
              }`}
              type="button"
              disabled={verificarValorExcedeCredito()}
              onClick={() => {
                if (verificarValorExcedeCredito()) return;
                
                const garantidorAtual = garantidores[qtdGarantidores - 1] || { ...initialGarantidor };
                const validacao = validarGrauParentesco(garantidorAtual);
                
                if (!validacao.valido) {
                  setErrosGarantidores(validacao.erros);
                  setMostrarErroGarantidores(true);
                  return;
                }
                setErrosGarantidores({});
                setMostrarErroGarantidores(false);
                
                // Finalizar cadastro
                enviarDadosParaBackend();
              }}
            >
              {verificarValorExcedeCredito() ? 'Valor Excede Limite' : 'Finalizar Cadastro'}
            </button>
          </div>
        </div>
      </section>
    );
  };

  // Modal de erro para garantidores
  const renderModalErroGarantidores = () => (
    <div className="fixed z-50 inset-0 flex items-center justify-center">
      <div className="fixed inset-0 bg-black opacity-30" />
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-md mx-auto z-50 flex flex-col items-center relative">
        <div className="text-red-600 text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold mb-2">Atenção!</h2>
        <p className="text-gray-700 mb-6 text-center">Existem campos obrigatórios não preenchidos ou com dados inválidos. Verifique os campos destacados em vermelho.</p>
        <button
          className="w-full py-3 font-semibold rounded-full bg-blue-700 text-white hover:bg-blue-800 transition transform hover:scale-105"
          onClick={() => setMostrarErroGarantidores(false)}
        >
          Entendi
        </button>
      </div>
    </div>
  );



  const renderModalErroRendaMinima = () => {
    if (!mostrarErroRendaMinima) return null;

    const rendaTotalAtual = calcularRendaTotalTodosTomadores();
    const rendaTotalNumerica = converterValorMonetario(rendaTotalAtual);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-lg w-full mx-4">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-orange-500 text-2xl font-bold">⚠</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Critérios de Renda Mínima Não Atendidos</h3>
            <p className="text-gray-600 mb-4">
              Para avançar, cada tomador deve atender a <strong>pelo menos um</strong> dos seguintes critérios:
            </p>
            <div className="bg-blue-50 rounded-lg p-4 mb-4 w-full border border-blue-200">
              <p className="text-sm font-semibold text-blue-800 mb-2">📋 Critérios de Aprovação:</p>
              <ul className="text-left text-blue-700 text-sm space-y-1">
                <li>• <strong>Renda Formal ≥ R$ 5.000</strong> (salário, pró-labore, etc.)</li>
                <li>• <strong>Renda Informal ≥ R$ 7.000</strong> (comércio, serviços, etc.)</li>
                <li>• <strong>OU ambos marcados como "Não se aplica"</strong></li>
              </ul>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6 w-full">
              <p className="text-sm text-gray-700 mb-2">Status da Validação:</p>
              {(() => {
                const validacao = validarRendaMinima();
                return (
                  <div className="space-y-2">
                    {validacao.detalhes.map((detalhe, idx) => (
                      <div key={idx} className={`text-sm p-2 rounded ${
                        detalhe.includes('Aprovado') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {detalhe}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
            
            <p className="text-gray-600 mb-6">
              Para continuar, você pode:
            </p>
            <ul className="text-left text-gray-600 mb-6 space-y-2">
              <li>• Aumentar a renda formal para R$ 5.000 ou mais</li>
              <li>• Aumentar a renda informal para R$ 7.000 ou mais</li>
              <li>• Marcar como "Não se aplica" se for o caso</li>
              <li>• Adicionar mais tomadores à operação</li>
            </ul>
            <button
              onClick={() => setMostrarErroRendaMinima(false)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Entendi
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Função para validar renda mínima de acordo com a nova lógica:
  // 1. Renda Formal ≥ R$ 5.000 → APROVADO
  // 2. Renda Formal < R$ 5.000, mas Renda Informal ≥ R$ 7.000 → APROVADO
  // 3. Renda Formal < R$ 5.000 E Renda Informal < R$ 7.000 → REPROVADO
  // 1. Renda Formal Consolidada (soma de todos os tomadores) ≥ R$ 5.000 → APROVADO
  // 2. Renda Formal Consolidada < R$ 5.000, mas Renda Informal Consolidada (soma de todos os tomadores) ≥ R$ 7.000 → APROVADO
  // 3. Caso contrário → REPROVADO
  // 4. "Não se aplica" = R$ 0,00 (NÃO pular validação)
  const validarRendaMinima = (): { aprovado: boolean; motivo: string; detalhes: string[] } => {
    const detalhes: string[] = [];
    let totalRendaFormalConsolidada = 0;
    let totalRendaInformalConsolidada = 0;

    for (let i = 0; i < (quantidade || 0); i++) {
      const tomador = tomadores[i];
      if (!tomador) continue;

      const rendaFormalNaoSeAplica = tomador.comprovacaoRendaFormal?.Name?.toLowerCase() === 'não se aplica';
      const rendaInformalNaoSeAplica = tomador.comprovacaoRendaInformal?.Name?.toLowerCase() === 'não se aplica';

      // Converter valores para números - "não se aplica" = R$ 0,00
      const rendaFormal = rendaFormalNaoSeAplica ? 0 : converterValorMonetario(tomador.rendaFormal);
      const rendaInformal = rendaInformalNaoSeAplica ? 0 : converterValorMonetario(tomador.rendaInformal);

      totalRendaFormalConsolidada += rendaFormal;
      totalRendaInformalConsolidada += rendaInformal;

      detalhes.push(`Tomador ${i + 1}: Formal: R$ ${rendaFormal.toFixed(2)}, Informal: R$ ${rendaInformal.toFixed(2)}`);
    }

    const aprovadoPorFormalConsolidada = totalRendaFormalConsolidada >= 5000;
    const aprovadoPorInformalConsolidada = totalRendaInformalConsolidada >= 7000;

    let aprovado = false;
    let motivo = '';

    if (aprovadoPorFormalConsolidada) {
      aprovado = true;
      motivo = `Aprovado: Renda Formal Consolidada (R$ ${totalRendaFormalConsolidada.toFixed(2)}) é maior ou igual a R$ 5.000.`;
    } else if (aprovadoPorInformalConsolidada) {
      aprovado = true;
      motivo = `Aprovado: Renda Formal Consolidada (R$ ${totalRendaFormalConsolidada.toFixed(2)}) é menor que R$ 5.000, mas Renda Informal Consolidada (R$ ${totalRendaInformalConsolidada.toFixed(2)}) é maior ou igual a R$ 7.000.`;
    } else {
      aprovado = false;
      motivo = `Reprovado: Renda Formal Consolidada (R$ ${totalRendaFormalConsolidada.toFixed(2)}) é menor que R$ 5.000 E Renda Informal Consolidada (R$ ${totalRendaInformalConsolidada.toFixed(2)}) é menor que R$ 7.000.`;
    }

    detalhes.unshift(`Renda Formal Consolidada Total: R$ ${totalRendaFormalConsolidada.toFixed(2)}`);
    detalhes.unshift(`Renda Informal Consolidada Total: R$ ${totalRendaInformalConsolidada.toFixed(2)}`);
    detalhes.unshift(motivo);

    return { aprovado, motivo, detalhes };
  };

  // Função para calcular renda total de todos os tomadores
  const calcularRendaTotalTodosTomadores = (): string => {
    const total = tomadores.reduce((soma, tomador) => {
      const rendaTotal = converterValorMonetario(tomador.rendaTotalInformada || 'R$ 0,00');
      return soma + rendaTotal;
    }, 0);
    return formatarValorMonetario(total);
  };

  // Função para gerar opções de parcelas
  const gerarOpcoesParcelas = () => {
    const opcoes = [];
    
    // Adicionar opção de 1 mês
    opcoes.push({ value: 1, label: '1 mês' });
    
    // Adicionar opções de 36 a 240 meses, pulando de 12 em 12
    for (let i = 36; i <= 240; i += 12) {
      const anos = Math.floor(i / 12);
      const label = anos === 1 ? `${i} meses (${anos} ano)` : `${i} meses (${anos} anos)`;
      opcoes.push({ value: i, label });
    }
    
    return opcoes;
  };

  const opcoesParcelas = gerarOpcoesParcelas();

  // Função para converter valor de parcelas para string
  const converterParcelasParaString = (valor: number) => {
    return valor.toString();
  };

  // Função para converter string para valor de parcelas
  const converterStringParaParcelas = (valor: string) => {
    const numero = parseInt(valor);
    return isNaN(numero) ? 1 : numero;
  };

  // Função para obter a opção selecionada baseada no valor atual
  const obterOpcaoSelecionada = () => {
    const valorAtual = converterStringParaParcelas(emprestimo.prazoSolicitado);
    return opcoesParcelas.find(opcao => opcao.value === valorAtual) || opcoesParcelas[0];
  };

  // Função para obter o índice da opção selecionada
  const obterIndiceSelecionado = () => {
    const valorAtual = converterStringParaParcelas(emprestimo.prazoSolicitado);
    return opcoesParcelas.findIndex(opcao => opcao.value === valorAtual);
  };

  // Função para atualizar o prazo solicitado
  const atualizarPrazoSolicitado = (novoValor: number) => {
    const novoPrazo = converterParcelasParaString(novoValor);
    limparErroEmprestimo('prazoSolicitado');
    setEmprestimo(e => ({ ...e, prazoSolicitado: novoPrazo }));
  };

  // Atualizar renda total do empréstimo sempre que os tomadores mudarem
  useEffect(() => {
    if (tomadores.length > 0) {
      const rendaTotalCalculada = calcularRendaTotalTodosTomadores();
      if (emprestimo.rendaTotal !== rendaTotalCalculada) {
        setEmprestimo(prev => ({ ...prev, rendaTotal: rendaTotalCalculada }));
      }
    }
  }, [tomadores, emprestimo.rendaTotal]);

  // Inicializar renda total quando entrar na etapa de empréstimo
  useEffect(() => {
    if (etapa === (quantidade || 0) + 1 && tomadores.length > 0) {
      const rendaTotalCalculada = calcularRendaTotalTodosTomadores();
      if (emprestimo.rendaTotal !== rendaTotalCalculada) {
        setEmprestimo(prev => ({ ...prev, rendaTotal: rendaTotalCalculada }));
      }
    }
  }, [etapa, quantidade, tomadores, emprestimo.rendaTotal]);

  // Função para scroll automático para o topo
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Função para transição suave entre etapas
  const transitionToEtapa = (novaEtapa: number) => {
    setIsTransitioning(true);
    setNextEtapa(novaEtapa);
    
    // Pequeno delay para permitir a animação de fade out
    setTimeout(() => {
      setEtapa(novaEtapa);
      setNextEtapa(null);
      setIsTransitioning(false);
      scrollToTop();
    }, 300);
  };

  // Overlay de transição
  const TransitionOverlay = () => {
    if (!isTransitioning) return null;
    
    return (
      <div className="fixed inset-0 bg-white bg-opacity-50 flex items-center justify-center z-40 transition-opacity duration-300">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-blue-600 font-medium">Carregando...</p>
        </div>
      </div>
    );
  };

  // Overlay de loading para envio
  const LoadingEnvioOverlay = () => {
    if (!isEnviando) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="flex flex-col items-center text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-6"></div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Enviando Dados</h3>
            <p className="text-gray-600 mb-4">
              Aguarde enquanto enviamos seus dados para análise...
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Scroll automático para o topo quando a etapa mudar
  useEffect(() => {
    if (!isTransitioning) {
      scrollToTop();
    }
  }, [etapa]);

  // Função para criar estrutura dinâmica no Google Drive
  const criarEstruturaDinamicaGoogleDrive = async (borrowersData: any[]) => {
    try {
      // Usar a API externa que já funciona (porta 300s1)
      const API_URL = 'http://localhost:3001';
      
      // Verificar se a API está rodando
      const statusResponse = await fetch(`${API_URL}/`);
      if (!statusResponse.ok) {
        throw new Error('API externa não está rodando. Inicie o servidor na porta 3001.');
      }

      // Preparar dados dos tomadores
      const tomadoresArray = borrowersData.map((tomador, index) => ({
        id: tomador.id || `tomador_${index + 1}`,
        nome: tomador.nome || `Tomador ${index + 1}`
      }));
      
      // Dados da proposta (você pode personalizar isso)
      const propostaId = `PROP_${Date.now()}`;
      const propostaNome = `Proposta_Libra_${new Date().toLocaleDateString('pt-BR')}`;

      // Criar estrutura dinâmica
      const response = await fetch(`${API_URL}/criar-estrutura-dinamica`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propostaId,
          propostaNome,
          tomadoresArray
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erro ao criar estrutura: ${errorData.error}`);
      }

      const result = await response.json();

      // Mostrar resumo detalhado
      let mensagemSucesso = `✅ Estrutura dinâmica criada com sucesso!\n\n`;
      mensagemSucesso += `📁 Proposta: ${result.data.propostaFolder.name}\n`;
      mensagemSucesso += `🔗 Link: ${result.data.propostaFolder.link}\n\n`;
      mensagemSucesso += `📊 Resumo:\n`;
      mensagemSucesso += `• ${result.data.resumo.totalTomadores} tomadores processados\n\n`;
      
      mensagemSucesso += `👥 Tomadores:\n`;
      result.data.resumo.tomadores.forEach((tomador, index) => {
        mensagemSucesso += `${index + 1}. ${tomador.nome} (${tomador.id})\n`;
      });

      mensagemSucesso += `\n📁 Estrutura criada:\n`;
      mensagemSucesso += `• Documentos Pessoais (com subpastas por tomador)\n`;
      mensagemSucesso += `• Comprovação de Renda (com subpastas por tomador)\n`;
      mensagemSucesso += `• Documentação do Imóvel (pasta única)\n`;

      alert(mensagemSucesso);

    } catch (error) {
      console.error('❌ Erro ao criar estrutura dinâmica:', error);
      
      let mensagemErro = '❌ Erro ao criar estrutura dinâmica:\n\n';
      
      if (error.message.includes('API externa não está rodando')) {
        mensagemErro += '• Inicie o servidor da API externa\n';
        mensagemErro += '• Execute: cd TESTE && npm start\n';
        mensagemErro += '• Aguarde a mensagem "Servidor rodando em http://localhost:3001"\n';
      } else if (error.message.includes('fetch')) {
        mensagemErro += '• Verifique se a API está rodando na porta 3001\n';
        mensagemErro += '• Verifique sua conexão com a internet\n';
      } else {
        mensagemErro += `• ${error.message}\n`;
      }
      
      mensagemErro += '\nVerifique o console para mais detalhes.';
      alert(mensagemErro);
    }
  };

  // Função para enviar documentos dos tomadores para o Google Drive (versão antiga - mantida para compatibilidade)
  const enviarRGCNHGoogleDrive = async (borrowersData: any[]) => {
    try {
      // Usar a API externa que já funciona (porta 3001)
      const API_URL = 'http://localhost:3001';
      
      // Verificar se a API está rodando
      const statusResponse = await fetch(`${API_URL}/`);
      if (!statusResponse.ok) {
        throw new Error('API externa não está rodando. Inicie o servidor na porta 3001.');
      }

      const resultados = [];
      const erros = [];

      // Processar cada tomador
      for (let i = 0; i < borrowersData.length; i++) {
        const tomador = borrowersData[i];
        const nomeTomador = tomador.nome || `Tomador ${i + 1}`;
        const idTomador = tomador.id || `tomador_${i + 1}`;
        

        try {
          // 1. Criar estrutura de pastas para o tomador
          
          const estruturaResponse = await fetch(`${API_URL}/test-structure`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              borrowerId: idTomador,
              borrowerName: nomeTomador
            })
          });

          if (!estruturaResponse.ok) {
            const errorData = await estruturaResponse.json();
            throw new Error(`Erro ao criar estrutura: ${errorData.error}`);
          }

          const estruturaResult = await estruturaResponse.json();

          // 2. Enviar documentos de identificação (RG/CNH)
          const docIdentificacao = documentosIdentificacao[i];

          if (docIdentificacao && docIdentificacao.file) {
            try {
              
              // Carregar arquivo do IndexedDB se necessário
              let fileToUpload = docIdentificacao.file;
              if (!fileToUpload && docIdentificacao.indexedDBId) {
                fileToUpload = await loadDocumentFromIndexedDB(docIdentificacao.indexedDBId);
              }

              if (fileToUpload) {
                const formData = new FormData();
                formData.append('file', fileToUpload);
                formData.append('borrowerId', idTomador);
                formData.append('borrowerName', nomeTomador);

                const uploadResponse = await fetch(`${API_URL}/upload-cnh`, {
                  method: 'POST',
                  body: formData
                });

                if (uploadResponse.ok) {
                  const uploadResult = await uploadResponse.json();
                } else {
                  const errorData = await uploadResponse.json();
                  console.error(`❌ Erro ao enviar documento: ${errorData.error}`);
                }
              }
            } catch (error) {
              console.error(`❌ Erro no documento de identificação:`, error);
            }
          }

          // 3. Enviar documentos de comprovante de endereço
          const docComprovante = documentosComprovanteEndereco[i];

          if (docComprovante && docComprovante.file) {
            try {
              
              let fileToUpload = docComprovante.file;
              if (!fileToUpload && docComprovante.indexedDBId) {
                fileToUpload = await loadDocumentFromIndexedDB(docComprovante.indexedDBId);
              }

              if (fileToUpload) {
                const formData = new FormData();
                formData.append('file', fileToUpload);
                formData.append('borrowerId', idTomador);
                formData.append('borrowerName', nomeTomador);

                const uploadResponse = await fetch(`${API_URL}/upload-comprovante-endereco`, {
                  method: 'POST',
                  body: formData
                });

                if (uploadResponse.ok) {
                  const uploadResult = await uploadResponse.json();
                } else {
                  const errorData = await uploadResponse.json();
                  console.error(`❌ Erro ao enviar comprovante: ${errorData.error}`);
                }
              }
            } catch (error) {
              console.error(`❌ Erro no comprovante de endereço:`, error);
            }
          }

          // 4. Enviar documentos de certidão civil
          const docCertidao = documentosCertificadoCivil[i];

          if (docCertidao && docCertidao.file) {
            try {
              
              let fileToUpload = docCertidao.file;
              if (!fileToUpload && docCertidao.indexedDBId) {
                fileToUpload = await loadDocumentFromIndexedDB(docCertidao.indexedDBId);
              }

              if (fileToUpload) {
                const formData = new FormData();
                formData.append('file', fileToUpload);
                formData.append('borrowerId', idTomador);
                formData.append('borrowerName', nomeTomador);

                const uploadResponse = await fetch(`${API_URL}/upload-certidao-casamento`, {
                  method: 'POST',
                  body: formData
                });

                if (uploadResponse.ok) {
                  const uploadResult = await uploadResponse.json();
                } else {
                  const errorData = await uploadResponse.json();
                  console.error(`❌ Erro ao enviar certidão: ${errorData.error}`);
                }
              }
            } catch (error) {
              console.error(`❌ Erro na certidão civil:`, error);
            }
          }

          // 5. Enviar holerites e extratos
          const docsHoleriteExtrato = documentosHoleriteExtrato[i] || [];

          if (docsHoleriteExtrato.length > 0) {
            try {
              
              const formData = new FormData();
              formData.append('borrowerId', idTomador);
              formData.append('borrowerName', nomeTomador);

              for (const documento of docsHoleriteExtrato) {
                let fileToUpload = documento.file;
                if (!fileToUpload && documento.indexedDBId) {
                  fileToUpload = await loadDocumentFromIndexedDB(documento.indexedDBId);
                }

                if (fileToUpload) {
                  formData.append('files', fileToUpload);
                }
              }

              const uploadResponse = await fetch(`${API_URL}/upload-multiple`, {
                method: 'POST',
                body: formData
              });

              if (uploadResponse.ok) {
                const uploadResult = await uploadResponse.json();
              } else {
                const errorData = await uploadResponse.json();
                console.error(`❌ Erro ao enviar holerites/extratos: ${errorData.error}`);
              }
            } catch (error) {
              console.error(`❌ Erro nos holerites/extratos:`, error);
            }
          }

          resultados.push({
            tomador: nomeTomador,
            id: idTomador,
            link: estruturaResult.data.tomadorFolder.link,
            sucesso: true
          });


        } catch (error) {
          console.error(`❌ Erro ao processar tomador ${nomeTomador}:`, error);
          erros.push({
            tomador: nomeTomador,
            erro: error.message
          });
        }
      }

      // Resumo final

      let mensagemSucesso = `✅ Envio para Google Drive concluído!\n\n`;
      mensagemSucesso += `📊 Resumo:\n`;
      mensagemSucesso += `• ${resultados.length} tomadores processados com sucesso\n`;
      mensagemSucesso += `• ${erros.length} tomadores com erro\n\n`;
      
      if (resultados.length > 0) {
        mensagemSucesso += `📁 Pastas criadas:\n`;
        resultados.forEach((resultado, index) => {
          mensagemSucesso += `${index + 1}. ${resultado.tomador}\n`;
        });
      }

      if (erros.length > 0) {
        mensagemSucesso += `\n❌ Erros:\n`;
        erros.forEach((erro, index) => {
          mensagemSucesso += `${index + 1}. ${erro.tomador}: ${erro.erro}\n`;
        });
      }

      alert(mensagemSucesso);

    } catch (error) {
      
      let mensagemErro = '❌ Erro ao enviar documentos:\n\n';
      
      if (error.message.includes('API externa não está rodando')) {
        mensagemErro += '• Inicie o servidor da API externa\n';
        mensagemErro += '• Execute: cd TESTE && npm start\n';
        mensagemErro += '• Aguarde a mensagem "Servidor rodando em http://localhost:3001"\n';
      } else if (error.message.includes('fetch')) {
        mensagemErro += '• Verifique se a API está rodando na porta 3001\n';
        mensagemErro += '• Verifique sua conexão com a internet\n';
      } else {
        mensagemErro += `• ${error.message}\n`;
      }
      
      mensagemErro += '\nVerifique o console para mais detalhes.';
      alert(mensagemErro);
    }

  };

  const enviarDocGoogleDriveTESTE = async (borrowersData: any[]) => {
    try {
      // Usar a API externa que já funciona (porta 3001)
      const API_URL = 'http://localhost:3001';
      
      // Verificar se a API está rodando
      const statusResponse = await fetch(`${API_URL}/`);
      if (!statusResponse.ok) {
        throw new Error('API externa não está rodando. Inicie o servidor na porta 3001.');
      }

      const resultados = [];
      const erros = [];

      // Processar cada tomador
      for (let i = 0; i < borrowersData.length; i++) {
        const tomador = borrowersData[i];
        const nomeTomador = tomador.nome || `Tomador ${i + 1}`;
        const idTomador = tomador.id || `tomador_${i + 1}`;
        

        try {
          // 1. Criar estrutura de pastas para o tomador
          
          const estruturaResponse = await fetch(`${API_URL}/test-structure`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              borrowerId: idTomador,
              borrowerName: nomeTomador
            })
          });

          if (!estruturaResponse.ok) {
            const errorData = await estruturaResponse.json();
            throw new Error(`Erro ao criar estrutura: ${errorData.error}`);
          }

          const estruturaResult = await estruturaResponse.json();

          // 2. Enviar documentos de identificação (RG/CNH)
          const docIdentificacao = documentosIdentificacao[i];

          if (docIdentificacao && docIdentificacao.file) {
            try {
              
              // Carregar arquivo do IndexedDB se necessário
              let fileToUpload = docIdentificacao.file;
              if (!fileToUpload && docIdentificacao.indexedDBId) {
                fileToUpload = await loadDocumentFromIndexedDB(docIdentificacao.indexedDBId);
              }

              if (fileToUpload) {
                const formData = new FormData();
                formData.append('file', fileToUpload);
                formData.append('borrowerId', idTomador);
                formData.append('borrowerName', nomeTomador);

                const uploadResponse = await fetch(`${API_URL}/upload-cnh`, {
                  method: 'POST',
                  body: formData
                });

                if (uploadResponse.ok) {
                  const uploadResult = await uploadResponse.json();
                } else {
                  const errorData = await uploadResponse.json();
                  console.error(`❌ Erro ao enviar documento: ${errorData.error}`);
                }
              }
            } catch (error) {
              console.error(`❌ Erro no documento de identificação:`, error);
            }
          }

          // 3. Enviar documentos de comprovante de endereço
          const docComprovante = documentosComprovanteEndereco[i];

          if (docComprovante && docComprovante.file) {
            try {
              
              let fileToUpload = docComprovante.file;
              if (!fileToUpload && docComprovante.indexedDBId) {
                fileToUpload = await loadDocumentFromIndexedDB(docComprovante.indexedDBId);
              }

              if (fileToUpload) {
                const formData = new FormData();
                formData.append('file', fileToUpload);
                formData.append('borrowerId', idTomador);
                formData.append('borrowerName', nomeTomador);

                const uploadResponse = await fetch(`${API_URL}/upload-comprovante-endereco`, {
                  method: 'POST',
                  body: formData
                });

                if (uploadResponse.ok) {
                  const uploadResult = await uploadResponse.json();
                } else {
                  const errorData = await uploadResponse.json();
                  console.error(`❌ Erro ao enviar comprovante: ${errorData.error}`);
                }
              }
            } catch (error) {
              console.error(`❌ Erro no comprovante de endereço:`, error);
            }
          }

          // 4. Enviar documentos de certidão civil
          const docCertidao = documentosCertificadoCivil[i];

          if (docCertidao && docCertidao.file) {
            try {
              
              let fileToUpload = docCertidao.file;
              if (!fileToUpload && docCertidao.indexedDBId) {
                fileToUpload = await loadDocumentFromIndexedDB(docCertidao.indexedDBId);
              }

              if (fileToUpload) {
                const formData = new FormData();
                formData.append('file', fileToUpload);
                formData.append('borrowerId', idTomador);
                formData.append('borrowerName', nomeTomador);

                const uploadResponse = await fetch(`${API_URL}/upload-certidao-casamento`, {
                  method: 'POST',
                  body: formData
                });

                if (uploadResponse.ok) {
                  const uploadResult = await uploadResponse.json();
                } else {
                  const errorData = await uploadResponse.json();
                  console.error(`❌ Erro ao enviar certidão: ${errorData.error}`);
                }
              }
            } catch (error) {
              console.error(`❌ Erro na certidão civil:`, error);
            }
          }

          // 5. Enviar holerites e extratos
          const docsHoleriteExtrato = documentosHoleriteExtrato[i] || [];

          if (docsHoleriteExtrato.length > 0) {
            try {
              
              const formData = new FormData();
              formData.append('borrowerId', idTomador);
              formData.append('borrowerName', nomeTomador);

              for (const documento of docsHoleriteExtrato) {
                let fileToUpload = documento.file;
                if (!fileToUpload && documento.indexedDBId) {
                  fileToUpload = await loadDocumentFromIndexedDB(documento.indexedDBId);
                }

                if (fileToUpload) {
                  formData.append('files', fileToUpload);
                }
              }

              const uploadResponse = await fetch(`${API_URL}/upload-multiple`, {
                method: 'POST',
                body: formData
              });

              if (uploadResponse.ok) {
                const uploadResult = await uploadResponse.json();
              } else {
                const errorData = await uploadResponse.json();
                console.error(`❌ Erro ao enviar holerites/extratos: ${errorData.error}`);
              }
            } catch (error) {
              console.error(`❌ Erro nos holerites/extratos:`, error);
            }
          }

          resultados.push({
            tomador: nomeTomador,
            id: idTomador,
            link: estruturaResult.data.tomadorFolder.link,
            sucesso: true
          });


        } catch (error) {
          console.error(`❌ Erro ao processar tomador ${nomeTomador}:`, error);
          erros.push({
            tomador: nomeTomador,
            erro: error.message
          });
        }
      }

      // Resumo final

      let mensagemSucesso = `✅ Envio para Google Drive concluído!\n\n`;
      mensagemSucesso += `📊 Resumo:\n`;
      mensagemSucesso += `• ${resultados.length} tomadores processados com sucesso\n`;
      mensagemSucesso += `• ${erros.length} tomadores com erro\n\n`;
      
      if (resultados.length > 0) {
        mensagemSucesso += `📁 Pastas criadas:\n`;
        resultados.forEach((resultado, index) => {
          mensagemSucesso += `${index + 1}. ${resultado.tomador}\n`;
        });
      }

      if (erros.length > 0) {
        mensagemSucesso += `\n❌ Erros:\n`;
        erros.forEach((erro, index) => {
          mensagemSucesso += `${index + 1}. ${erro.tomador}: ${erro.erro}\n`;
        });
      }

      alert(mensagemSucesso);

    } catch (error) {
      
      let mensagemErro = '❌ Erro ao enviar documentos:\n\n';
      
      if (error.message.includes('API externa não está rodando')) {
        mensagemErro += '• Inicie o servidor da API externa\n';
        mensagemErro += '• Execute: cd TESTE && npm start\n';
        mensagemErro += '• Aguarde a mensagem "Servidor rodando em http://localhost:3001"\n';
      } else if (error.message.includes('fetch')) {
        mensagemErro += '• Verifique se a API está rodando na porta 3001\n';
        mensagemErro += '• Verifique sua conexão com a internet\n';
      } else {
        mensagemErro += `• ${error.message}\n`;
      }
      
      mensagemErro += '\nVerifique o console para mais detalhes.';
      alert(mensagemErro);
    }

  };

  // Função para recuperar arquivo do IndexedDB
  const recuperarArquivoDoIndexedDB = async (indexedDBId: string): Promise<File | null> => {
    try {
      // Usar a função existente do indexedDBManager que já retorna um File
      const file = await loadDocumentFromIndexedDB(indexedDBId);
      return file;
    } catch (error) {
      console.error('❌ Erro ao recuperar arquivo do IndexedDB:', error);
      return null;
    }
  };

  // Função para testar envio de documentos do imóvel para Google Drive
  const testarEnvioDocumentosImovel = async () => {
    try {
      // Verificar se há documentos selecionados
      const totalDocumentos = documentosMatricula.length + documentosCAR.length + 
                             documentosITR.length + documentosCCIR.length + 
                             documentosFotosImovel.length;
      
      if (totalDocumentos === 0) {
        alert('❌ Nenhum documento do imóvel selecionado para envio!');
        return;
      }

      // 1. Criar estrutura de pastas primeiro
      const estruturaResponse = await fetch('http://localhost:3001/criar-estrutura-dinamica', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quantidade: 1, // Apenas para criar a estrutura
          tomadores: [{ nome: 'Teste Imóvel' }]
        })
      });

      if (!estruturaResponse.ok) {
        throw new Error('Erro ao criar estrutura de pastas');
      }

      const estruturaData = await estruturaResponse.json();

      // 2. Preparar FormData para envio dos documentos do imóvel
      const formData = new FormData();
      formData.append('propostaFolderId', estruturaData.data.propostaFolder.id);

      // Adicionar documentos de matrícula
      documentosMatricula.forEach((file, index) => {
        formData.append('matricula', file);
      });

      // Adicionar documentos de CAR
      documentosCAR.forEach((file, index) => {
        formData.append('car', file);
      });

      // Adicionar documentos de ITR
      documentosITR.forEach((file, index) => {
        formData.append('itr', file);
      });

      // Adicionar documentos de CCIR
      documentosCCIR.forEach((file, index) => {
        formData.append('ccir', file);
      });

      // Adicionar fotos do imóvel
      documentosFotosImovel.forEach((file, index) => {
        formData.append('fotos_imovel', file);
      });

      // 3. Enviar documentos do imóvel
      const uploadResponse = await fetch('http://localhost:3001/upload-documentos-imovel', {
        method: 'POST',
        body: formData
      });

      if (uploadResponse.ok) {
        const uploadData = await uploadResponse.json();
        
        const resumo = `
🏠 === TESTE DE ENVIO DE DOCUMENTOS DO IMÓVEL CONCLUÍDO ===

📁 Pasta criada: ${estruturaData.data.propostaFolder.webViewLink}
📊 Documentos enviados: ${uploadData.data.documentosEnviados.length}
📄 Erros: ${uploadData.data.erros.length}

📋 Documentos enviados:
${uploadData.data.documentosEnviados.map(doc => `• ${doc.tipo}: ${doc.nome}`).join('\n')}

${uploadData.data.erros.length > 0 ? `\n❌ Erros:\n${uploadData.data.erros.map(err => `• ${err.tipo}: ${err.erro}`).join('\n')}` : ''}
        `;
        
        alert(resumo);
      } else {
        const errorData = await uploadResponse.json();
        console.error('❌ Erro no upload:', errorData);
        alert(`❌ Erro no upload: ${errorData.message}`);
      }

    } catch (error) {
      console.error('❌ Erro no teste de envio de documentos do imóvel:', error);
      alert(`❌ Erro no teste: ${error.message}`);
    }
  };

  // Função para testar envio de documentos para Google Drive
  const testarEnvioDocumentosGoogleDrive = async () => {
    try {
      // Verificar se há tomadores cadastrados
      if (!tomadores || tomadores.length === 0) {
        alert('⚠️ Nenhum tomador cadastrado para teste.');
        return;
      }

      // Preparar dados dos tomadores para teste
      const tomadoresParaTeste = tomadores.slice(0, quantidade || 0).map((tomador, index) => ({
        id: `teste_${index + 1}`,
        nome: tomador.nome || `Tomador ${index + 1}`
      }));

      // 1. Criar estrutura dinâmica de pastas
      const estruturaResponse = await fetch('http://localhost:3001/criar-estrutura-dinamica', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propostaId: 'TESTE_' + Date.now(),
          propostaNome: 'Teste de Envio de Documentos',
          tomadoresArray: tomadoresParaTeste
        })
      });

      if (!estruturaResponse.ok) {
        throw new Error('Erro ao criar estrutura de pastas');
      }

      const estruturaData = await estruturaResponse.json();

      // 2. Preparar FormData para envio dinâmico
      const formData = new FormData();
      formData.append('propostaFolderId', estruturaData.data.propostaFolder.id);
      formData.append('tomadoresArray', JSON.stringify(tomadoresParaTeste));

      // 3. Adicionar documentos de cada tomador
      for (let i = 0; i < tomadoresParaTeste.length; i++) {
        const tomador = tomadoresParaTeste[i];

        // Adicionar documento de identificação
        const docIdentificacao = documentosIdentificacao[i];
        if (docIdentificacao && docIdentificacao.indexedDBId) {
          const file = await recuperarArquivoDoIndexedDB(docIdentificacao.indexedDBId);
          if (file) {
            formData.append('identificacao', file);
          }
        }

        // Adicionar certificado civil
        const docCasamento = documentosCertificadoCivil[i];
        if (docCasamento && docCasamento.indexedDBId) {
          const file = await recuperarArquivoDoIndexedDB(docCasamento.indexedDBId);
          if (file) {
            formData.append('certificado_civil', file);
          }
        }

        // Adicionar comprovante de endereço
        const docEndereco = documentosComprovanteEndereco[i];
        if (docEndereco && docEndereco.indexedDBId) {
          const file = await recuperarArquivoDoIndexedDB(docEndereco.indexedDBId);
          if (file) {
            formData.append('comprovante_endereco', file);
          }
        }

        // Adicionar holerites e extratos
        const docsHoleriteExtrato = documentosHoleriteExtrato[i] || [];
        
        for (const doc of docsHoleriteExtrato) {
          if (doc.indexedDBId) {
            const file = await recuperarArquivoDoIndexedDB(doc.indexedDBId);
            if (file) {
              formData.append('holerites', file);
            }
          }
        }
      }

      // 3.5. Adicionar documentos do imóvel (globais, não por tomador)
      // Adicionar documentos de matrícula
      documentosMatricula.forEach((file, index) => {
        formData.append('matricula', file);
      });

      // Adicionar documentos de CAR
      documentosCAR.forEach((file, index) => {
        formData.append('car', file);
      });

      // Adicionar documentos de ITR
      documentosITR.forEach((file, index) => {
        formData.append('itr', file);
      });

      // Adicionar documentos de CCIR
      documentosCCIR.forEach((file, index) => {
        formData.append('ccir', file);
      });

      // Adicionar fotos do imóvel
      documentosFotosImovel.forEach((file, index) => {
        formData.append('fotos_imovel', file);
      });

      // 4. Enviar todos os documentos de uma vez
      const uploadResponse = await fetch('http://localhost:3001/upload-documentos-dinamicos', {
        method: 'POST',
        body: formData
      });

      if (uploadResponse.ok) {
        const uploadResult = await uploadResponse.json();
        
        // Mostrar resumo dos resultados
        let resumo = `✅ Teste concluído!\n\n📁 Pasta criada: ${estruturaData.data.propostaFolder.link}\n\n`;
        
        uploadResult.data.tomadores.forEach((tomador, index) => {
          resumo += `\n👤 Tomador ${index + 1} (${tomador.tomadorNome}):\n`;
          resumo += `  📄 Documentos enviados: ${tomador.documentosEnviados.length}\n`;
          tomador.documentosEnviados.forEach(doc => {
            resumo += `    • ${doc.tipo}: ${doc.nome}\n`;
          });
          if (tomador.erros.length > 0) {
            resumo += `  ❌ Erros: ${tomador.erros.length}\n`;
            tomador.erros.forEach(erro => {
              resumo += `    • ${erro.tipo}: ${erro.erro}\n`;
            });
          }
        });

        // Adicionar documentos do imóvel no resumo
        if (uploadResult.data.documentosImovel && uploadResult.data.documentosImovel.length > 0) {
          resumo += `\n🏠 Documentos do Imóvel:\n`;
          resumo += `  📄 Documentos enviados: ${uploadResult.data.documentosImovel.length}\n`;
          uploadResult.data.documentosImovel.forEach(doc => {
            resumo += `    • ${doc.tipo}: ${doc.nome}\n`;
          });
        }

        // Adicionar erros gerais se houver
        if (uploadResult.data.erros && uploadResult.data.erros.length > 0) {
          resumo += `\n❌ Erros gerais: ${uploadResult.data.erros.length}\n`;
          uploadResult.data.erros.forEach(erro => {
            resumo += `  • ${erro.tipo}: ${erro.erro}\n`;
          });
        }
        
        alert(resumo);
      } else {
        const errorData = await uploadResponse.json();
        console.error('❌ Erro no upload:', errorData);
        alert(`❌ Erro no upload: ${errorData.message}`);
      }

    } catch (error) {
      console.error('❌ Erro no teste de envio:', error);
      alert(`❌ Erro no teste: ${error.message}`);
    }
  };

  // Botão de teste para Google Drive (temporário)
  const BotaoTesteEnvioDocGoogleDrive = () => {
    return (
      <div className="fixed bottom-4 right-32 z-50">
        <button
          onClick={testarEnvioDocumentosGoogleDrive}
          className="bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-green-700 transition-colors"
        >
          🧪 Teste Envio Documentos
        </button>
      </div>
    );
  };

  // Função para enviar dados para o backend
  const enviarDadosParaBackend = async () => {
    setIsEnviando(true);
    try {
      // Lista de todos os campos possíveis do tomador
      const camposTomador = [
        'estadoCivil', 'tipoPessoa', 'nome', 'dataNascimento', 'email', 'telefone', 'cep', 'endereco',
        'profissao', 'qualificacaoProfissional', 'comprovacaoRendaFormal', 'rendaFormal',
        'comprovacaoRendaInformal', 'rendaInformal', 'rendaTotalInformada',
        'cpf', 'cnpj', 'ramoPJ', 'quantidadeSociosPJ', 'numeroAdmin',
        'possuiPJVinculada', 'pjComporRenda', 'quantidadePJ', 'pjsVinculadas'
      ];

      // Preparar dados dos tomadores (apenas até a quantidade selecionada, todos os campos)
      const tomadoresParaEnviar = tomadores.slice(0, quantidade || 0).map(tomador => {
        const dadosTomador: any = {};
        camposTomador.forEach(campo => {
          dadosTomador[campo] = tomador[campo] ?? "";
        });
        return dadosTomador;
      });

      // Preparar dados do empréstimo
      const dadosEmprestimo = {
        amortizacao: emprestimo.amortizacao,
        carencia: emprestimo.carencia,
        valorSolicitado: emprestimo.valorSolicitado,
        rendaTotal: emprestimo.rendaTotal,
        prazoSolicitado: emprestimo.prazoSolicitado,
        jurosSolicitado: emprestimo.jurosSolicitado,
        motivoEmprestimo: emprestimo.motivoEmprestimo,
        comentarios: emprestimo.comentarios
      };

      // Preparar dados da garantia
      const dadosGarantia = {
        garantiaPertenceTomador: garantia.garantiaPertenceTomador,
        valorGarantia: garantia.valorGarantia,
        situacaoGarantia: garantia.situacaoGarantia,
        cepGarantia: garantia.cepGarantia,
        numeroGarantia: garantia.numeroGarantia,
        cidadeGarantia: garantia.cidadeGarantia,
        ruralUrbano: garantia.ruralUrbano,
        enderecoGarantia: garantia.enderecoGarantia,
        unidadeFederativa: garantia.unidadeFederativa, // Nome completo do estado
        unidadeFederativaSigla: garantia.unidadeFederativaSigla, // Sigla do estado
        comQuemEstaFinanciada: garantia.comQuemEstaFinanciada,
        valorEmAberto: garantia.valorEmAberto,
        quantasParcelasFalta: garantia.quantasParcelasFalta,
        escritura: garantia.escritura,
        nomeNaMatricula: Boolean(garantia.nomeMatrícula),
        processoInventario: garantia.processoInventario,
        imovelAverbado: garantia.imovelAverbado,
        possuiUsufruto: garantia.possuiUsufruto,
        dividaCondominio: garantia.dividaCondominio,
        dividaIPTU: garantia.dividaIPTU,
        dividaITR: garantia.dividaITR,
        utilizacaoGarantia: garantia.utilizacaoGarantia,
        tipoGarantia: garantia.tipoGarantia
      };

      // Preparar dados dos garantidores (apenas os preenchidos)
      const garantidoresParaEnviar = garantidores.slice(0, qtdGarantidores).map(garantidor => ({
        tipoPessoa: garantidor.tipoPessoa,
        estadoCivil: garantidor.estadoCivil,
        nome: garantidor.nome,
        cpf: garantidor.cpf,
        cnpj: garantidor.cnpj,
        profissao: garantidor.profissao,
        email: garantidor.email,
        temEmpresa: garantidor.temEmpresa
      }));

      // Pegar o grau de parentesco do último garantidor
      const ultimoGarantidor = garantidores[qtdGarantidores - 1] || { ...initialGarantidor };
      const grauParentesco = ultimoGarantidor.grauParentesco || { Id: '', Name: '' };

      // Dados completos para envio
      const dadosCompletos = {
        quantidadeTomadores: { Id: quantidadeId, Name: quantidade },
        UsuarioData: profile?.UsuarioData || 'Usuário não identificado', // Adicionar UsuarioData do profile
        GrupoNome: userGroup?.name || 'Grupo não identificado', // Adicionar nome do grupo
        EmailParceiroResponsavel: emailParceiroResponsavel || 'E-mail não informado', // Adicionar e-mail do parceiro responsável
        tomadores: tomadoresParaEnviar,
        emprestimo: dadosEmprestimo,
        garantia: dadosGarantia,
        quantidadeGarantidores: { Id: qtdGarantidoresId, Name: qtdGarantidores },
        garantidores: garantidoresParaEnviar,
        grauParentesco: grauParentesco, // Grau de parentesco no corpo principal
        timestamp: new Date().toISOString()
      };


      // ===== ENVIO PARA O PLOOMES =====
      // Enviar para o backend primeiro para obter o formLink

      // https://portal-parceiros-api.vercel.app/cadastro/offline/env
      const response = await fetch('http://localhost:3063/cadastro/offline/env', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dadosCompletos)
      });

      let formLink = null;
      let apiResult = null;
      
      if (response.ok) {
        apiResult = await response.json();
        formLink = apiResult.linkForm || null; // Capturar o formLink do retorno da API
      } else {
        const errorText = await response.text();
        throw new Error(`Erro no servidor: ${response.status} - ${errorText}`);
      }

      // Verificar se o Ploomes retornou sucesso antes de salvar no register_proposal
      const ploomesSuccessMessage = apiResult?.msg || '';
      const isPloomesSuccess = ploomesSuccessMessage === 'Card criado com sucesso!';

      // Só salvar no register_proposal se o Ploomes retornou sucesso
      if (isPloomesSuccess) {
        try {
          // 1. Inserir proposta na tabela register_proposal (primeiro tomador)
          const primeiroTomador = tomadoresParaEnviar[0];
          if (!primeiroTomador) {
            throw new Error('Primeiro tomador não encontrado');
          }

          // Determinar o tipo de pessoa
          const tipoPessoa = primeiroTomador.tipoPessoa?.Name?.toLowerCase();
          const typePeople = tipoPessoa === 'pessoa física' ? 'fisica' : 
                            tipoPessoa === 'pessoa jurídica' ? 'juridica' : null;

           // Função auxiliar para tratar links vazios
           const tratarLink = (link) => {
             return link && link.trim() !== '' ? link : 'Sem link';
           };

           // Inserir proposta
           const { data: propostaData, error: propostaError } = await supabase
             .from('register_proposal')
             .insert({
               nome: primeiroTomador.nome,
               cpf: primeiroTomador.cpf || null,
               cnpj: primeiroTomador.cnpj || null,
               type_people: typePeople,
               user_id: profile?.id || null,
               group_id: profile?.group_id || null,
               form_link: tratarLink(apiResult.link?.form_t1_link),
               form_link_garantidor: tratarLink(apiResult.link?.formGarantidorLink),
               form_link_garantia: tratarLink(apiResult.link?.formLinkGarantia),
               form_link_t2: tratarLink(apiResult.link?.form_t2_link),
               form_link_t3: tratarLink(apiResult.link?.form_t3_link),
               form_link_t4: tratarLink(apiResult.link?.form_t4_link),
               form_link_g1: tratarLink(apiResult.link?.form_g1_link),
               form_link_g2: tratarLink(apiResult.link?.form_g2_link),
               form_link_g3: tratarLink(apiResult.link?.form_g3_link),
               form_link_g4: tratarLink(apiResult.link?.form_g4_link),
               tipo_imovel: garantia.ruralUrbano?.Name || null,
               nome_user: profile?.name || null,
               email_user: profile?.email || null
             })
             .select()
             .single();

          if (propostaError) {
            console.error('❌ Erro ao inserir proposta:', propostaError);
            throw new Error(`Erro ao inserir proposta: ${propostaError.message}`);
          }

          const proposalId = propostaData.id;

          // 2. Inserir todos os tomadores na tabela borrowers
          const borrowersParaInserir = tomadoresParaEnviar.map(tomador => {
            const tipoPessoa = tomador.tipoPessoa?.Name?.toLowerCase();
            const typePeople = tipoPessoa === 'pessoa física' ? 'fisica' : 
                             tipoPessoa === 'pessoa jurídica' ? 'juridica' : 'fisica'; // default para fisica

            return {
              proposal_id: proposalId,
              nome: tomador.nome,
              cpf: tomador.cpf || null,
              cnpj: tomador.cnpj || null,
              type_people: typePeople,
              email: tomador.email || null,
              telefone: tomador.telefone || null
            };
          });

          const { data: borrowersData, error: borrowersError } = await supabase
            .from('borrowers')
            .insert(borrowersParaInserir)
            .select();

          if (borrowersError) {
            console.error('❌ Erro ao inserir tomadores:', borrowersError);
            throw new Error(`Erro ao inserir tomadores: ${borrowersError.message}`);
          }


          // // 3. Enviar documentos de identificação
          // if (borrowersData) {
          //   await enviarDocumentosIdentificacao(borrowersData);
          // }

          // // 4. Enviar documentos de comprovante de endereço
          // if (borrowersData) {
          //   await enviarDocumentosComprovanteEndereco(borrowersData);
          // }

          // // 5. Enviar documentos de certificado civil
          // if (borrowersData) {
          //   await enviarDocumentosCertificadoCivil(borrowersData);
          // }

          // // 6. Enviar documentos de holerite e extrato
          // if (borrowersData) {
          //   await enviarDocumentosHoleriteExtrato(borrowersData);
          // }

        } catch (supabaseError) {
          console.error('❌ Erro ao salvar no Supabase:', supabaseError);
          // Continuar com o envio para o Ploomes mesmo se houver erro no Supabase
        }
      }

      // Processar resposta da API (já processada anteriormente)
      if (apiResult) {
        setSuccessData({
          status: apiResult.status,
          msg: apiResult.msg,
          nomeCompleto: apiResult.retorno?.nomeCompleto,
          email: apiResult.retorno?.email
        });
        setShowSuccessModal(true);
      }

    } catch (error) {
      console.error('❌ Erro ao enviar dados:', error);
      setErroEnvio(error.message || 'Erro desconhecido ao enviar formulário');
      setShowModalErroEnvio(true);
    } finally {
      setIsEnviando(false);
    }
  };

  // Modal de sucesso para exibir retorno da API
  const renderModalSucesso = () => {
    if (!showSuccessModal || !successData) return null;

    // Se a API retornou dados, consideramos sucesso (mesmo que status não seja 'success')
    const isSuccess = successData.status === 'success' || 
                     successData.status === 200 || 
                     successData.status === 'OK' ||
                     (successData.msg && successData.msg.toLowerCase().includes('sucesso'));

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all">
          <div className="flex flex-col items-center text-center">
            {/* Ícone de sucesso/erro */}
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${
              isSuccess ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {isSuccess ? (
                <svg className="w-12 h-12 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-12 h-12 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>

            {/* Título */}
            <h2 className={`text-2xl font-bold mb-4 ${
              isSuccess ? 'text-green-800' : 'text-red-800'
            }`}>
              {isSuccess ? 'Cadastro Realizado!' : 'Erro no Cadastro'}
            </h2>

            {/* Mensagem da API */}
            <p className="text-gray-700 mb-6 leading-relaxed">
              {successData.msg || 'Operação concluída com sucesso!'}
            </p>

            {/* Informações do cliente */}
            {isSuccess && successData.nomeCompleto && (
              <div className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-6">
                <h3 className="text-sm font-semibold text-blue-900 mb-3">Informações do Cliente:</h3>
                <div className="space-y-2 text-left">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-blue-800">
                      <strong>Nome:</strong> {successData.nomeCompleto}
                    </span>
                  </div>
                  {successData.email && (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                      </svg>
                      <span className="text-sm text-blue-800">
                        <strong>Email:</strong> {successData.email}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Status da operação */}
            <div className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Status:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  isSuccess 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {successData.status}
                </span>
              </div>
            </div>

            {/* Botões de ação */}
            {isSuccess ? (
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    setSuccessData(null);
                    navigate('/meus-cadastros');
                  }}
                  className="w-full py-3 px-6 font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
                >
                  Enviar documentos
                </button>
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    setSuccessData(null);
                    // Limpar todos os dados do formulário e voltar para etapa inicial
                    limparTodosOsDados();
                  }}
                  className="w-full py-3 px-6 font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700"
                >
                  Novo Cadastro
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setSuccessData(null);
                }}
                className="w-full py-3 px-6 font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-red-600 to-pink-600 text-white hover:from-red-700 hover:to-pink-700"
              >
                Tentar Novamente
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Modal de erro de envio
  const renderModalErroEnvio = () => {
    if (!showModalErroEnvio) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-lg w-full mx-4">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-red-500 text-2xl font-bold">⚠</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Erro no Envio</h3>
            <p className="text-gray-600 mb-6">
              {erroEnvio}
            </p>
            <p className="text-gray-600 mb-6">
              O que você gostaria de fazer?
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                onClick={() => {
                  setShowModalErroEnvio(false);
                  setErroEnvio('');
                  // Manter os dados e tentar novamente
                  enviarDadosParaBackend();
                }}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Tentar Novamente
              </button>
              <button
                onClick={() => {
                  setShowModalErroEnvio(false);
                  setErroEnvio('');
                  // Limpar dados e começar novo cadastro
                  limparTodosOsDados();
                }}
                className="flex-1 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Novo Cadastro
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };


  // Banner informativo sobre IRPF
  const renderBannerIRPF = () => {
    if (!showBannerIRPF) return null;

    return (
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-2xl w-full mx-4">
        <div className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl shadow-2xl border border-red-400 p-6 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-1">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-2">⚠️ IRPF Obrigatório</h3>
              <p className="text-sm leading-relaxed mb-4">
                Para operações acima de <strong>R$ 200.000,00</strong>, é obrigatório apresentar a declaração do Imposto de Renda Pessoa Física (IRPF).
              </p>
              <div className="flex justify-end">
                <button
                  onClick={() => setShowBannerIRPF(false)}
                  className="bg-white text-red-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-md"
                >
                  Entendi
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Modal de confirmação para limpar dados
  const renderModalLimparDados = () => {
    if (!showModalLimparDados) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-orange-500 text-2xl font-bold">⚠</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Limpar Dados</h3>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja apagar todos os dados preenchidos? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setShowModalLimparDados(false)}
                className="flex-1 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowModalLimparDados(false);
                  limparTodosOsDados();
                }}
                className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Sim, Limpar Tudo
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Botão de teste para debug (temporário)
  const BotaoTesteEnvio = () => (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => {
          enviarDadosParaBackend();
        }}
        className="bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-red-700 transition-colors"
      >
        🧪 Teste Envio
      </button>
    </div>
  );


  // Botão de teste para Google Drive (temporário)
  const BotaoTesteGoogleDrive = () => {
    const handleTesteGoogleDrive = async () => {
      // Preparar dados dos tomadores para teste
      const tomadoresParaTeste = tomadores.slice(0, quantidade || 0).map((tomador, index) => ({
        id: `teste_${index + 1}`,
        nome: tomador.nome || `Tomador ${index + 1}`
      }));

      if (tomadoresParaTeste.length === 0) {
        alert('⚠️ Nenhum tomador cadastrado para teste.');
        return;
      }

      await criarEstruturaDinamicaGoogleDrive(tomadoresParaTeste);
    };

    return (
      <div className="fixed bottom-4 right-32 z-50">
        <button
          onClick={handleTesteGoogleDrive}
          className="bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-green-700 transition-colors"
        >
          🏗️ Criar Estrutura Dinâmica
        </button>
      </div>
    );
  };

  // Ajustar renderização principal para incluir fluxo correto
  return (
    <div className="p-6 min-h-screen">
      {showGarantidorModal && renderGarantidorModal()}
      {renderBanner()}
      <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-start justify-center py-16">
        <div className="flex space-x-8 max-w-7xl w-full px-4">
          {renderSidebar()}
          <div className="flex-1 flex flex-col items-center max-w-8xl">
            {etapa === 0
              ? renderSelecaoQuantidade()
              : etapa > 0 && etapa <= (quantidade || 0)
                ? renderCadastroTomador()
                : etapa === (quantidade || 0) + 1
                  ? renderEmprestimo()
                  : etapa === (quantidade || 0) + 2
                    ? renderGarantia()
                    : etapa === (quantidade || 0) + 3 && garantia.garantiaPertenceTomador?.Name === 'Imóvel de terceiro'
                      ? renderQtdGarantidores()
                      : etapa >= (quantidade || 0) + 4 && etapa < (quantidade || 0) + 4 + qtdGarantidores && garantia.garantiaPertenceTomador?.Name === 'Imóvel de terceiro'
                        ? renderGarantidores()
                        : etapa === (quantidade || 0) + 4 + qtdGarantidores && garantia.garantiaPertenceTomador?.Name === 'Imóvel de terceiro'
                          ? renderGrauParentesco()
                          : null}
          </div>
        </div>
        {mostrarErro && renderModalErro()}
        {mostrarErroEmprestimo && renderModalErroEmprestimo()}
        {mostrarErroGarantia && renderModalErroGarantia()}
        {mostrarErroGarantidores && renderModalErroGarantidores()}
        {mostrarErroRendaMinima && renderModalErroRendaMinima()}
        {showModalErroEnvio && renderModalErroEnvio()}
        {showModalLimparDados && renderModalLimparDados()}
        {tomadores[0].tipoPessoa?.Name?.toLowerCase() !== 'pessoa jurídica'  && renderBannerIRPF()}
        {/* Botão de debug fixo no canto inferior direito */}
      </main>
      {/* <TransitionOverlay /> */}
      <LoadingEnvioOverlay />
      {/* <BotaoTesteEnvio /> */}
      {/* <BotaoTesteGoogleDrive /> */}
      {showSuccessModal && renderModalSucesso()}
    </div>
  );
};

export default Formulario;