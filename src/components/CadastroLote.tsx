import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../integrations/supabase/client';

type Cliente = {
  nome: string;
  email: string;
  telefone?: string;
};

type ParseResult = {
  validos: Cliente[];
  invalidos: { linha: number; erro: string; dados: any }[];
  headersEncontrados: string[];
};

const CABECALHOS_ESPERADOS = ['nome', 'email', 'telefone'] as const;

// Normaliza textos: minúsculo, sem acentos e sem espaços extras
function normalize(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function sanitizePhone(phone: string | undefined): string {
  if (!phone) return '';
  return phone.toString().replace(/\D/g, '');
}

function isValidEmail(email: string): boolean {
  if (!email) return false;
  // Regex simples e suficiente para validação básica
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Gera e baixa o modelo Excel com cabeçalho e uma linha de exemplo
function baixarModeloExcel() {
  const rows = [
    ['nome', 'email', 'telefone'], // cabeçalho
    ['João da Silva', 'joao.silva@email.com', '11999999999'],
    ['Maria Souza', 'maria.souza@email.com', '21988887777'],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Modelo');
  XLSX.writeFile(wb, 'modelo_cadastro_clientes.xlsx');
}

// Tenta localizar índices de colunas mesmo que o usuário altere a ordem
function mapearIndicesColunas(headerRow: any[]): Record<string, number> {
  const mapa: Record<string, number> = {};
  const normalizados = headerRow.map((h) => normalize(h));
  for (const esperado of CABECALHOS_ESPERADOS) {
    const idx = normalizados.indexOf(esperado);
    mapa[esperado] = idx; // -1 se não achou
  }
  return mapa;
}

// Faz o parse do arquivo XLSX/CSV para objetos Cliente com validação básica
function parseClientesFromSheet(ws: XLSX.WorkSheet): ParseResult {
  // header: 1 => array de arrays (linhas cruas), preserva cabeçalho original
  const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' });
  if (!data.length) {
    return { validos: [], invalidos: [{ linha: 0, erro: 'Planilha vazia', dados: {} }], headersEncontrados: [] };
  }

  const headerRow = data[0];
  const headersEncontrados = headerRow.map((h) => (h ?? '').toString());
  const indices = mapearIndicesColunas(headerRow);
  const validos: Cliente[] = [];
  const invalidos: { linha: number; erro: string; dados: any }[] = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i] || [];
    // Extrai campos pela posição mapeada; se não existir, fica vazio
    const nome = (indices.nome >= 0 ? row[indices.nome] : '').toString().trim();
    const email = (indices.email >= 0 ? row[indices.email] : '').toString().trim();
    const telefone = sanitizePhone(indices.telefone >= 0 ? row[indices.telefone] : '');

    // Validações básicas
    if (!nome) {
      invalidos.push({ linha: i + 1, erro: 'Nome é obrigatório', dados: row });
      continue;
    }
    if (!email || !isValidEmail(email)) {
      invalidos.push({ linha: i + 1, erro: 'Email inválido/obrigatório', dados: row });
      continue;
    }

    validos.push({ nome, email, telefone });
  }

  // Remove duplicados pelo email dentro do próprio arquivo
  const seen = new Set<string>();
  const dedupValidos: Cliente[] = [];
  for (const c of validos) {
    const key = normalize(c.email);
    if (seen.has(key)) continue;
    seen.add(key);
    dedupValidos.push(c);
  }

  return { validos: dedupValidos, invalidos, headersEncontrados };
}

// Insere em lote no Supabase com chunks (melhor para volumes grandes)
async function inserirEmLotesSupabase(
  registros: Cliente[],
  tabela = 'clientes',
  chunkSize = 500
): Promise<{ inseridos: number; erros: { indexInicial: number; error: string }[] }> {
  let inseridos = 0;
  const erros: { indexInicial: number; error: string }[] = [];

  for (let i = 0; i < registros.length; i += chunkSize) {
    const slice = registros.slice(i, i + chunkSize);

    // Ajuste aqui se desejar upsert por email (se existir unique index)
    // const { error } = await supabase.from(tabela).upsert(slice, { onConflict: 'email', ignoreDuplicates: true });

    const { error } = await supabase.from(tabela).insert(slice);
    if (error) {
      erros.push({ indexInicial: i, error: error.message });
    } else {
      inseridos += slice.length;
    }
  }

  return { inseridos, erros };
}

export function CadastroLote() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<Cliente[]>([]);
  const [invalidos, setInvalidos] = useState<{ linha: number; erro: string; dados: any }[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<{ inseridos: number; erros: number } | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setResultado(null);
    setPreview([]);
    setInvalidos([]);
    setHeaders([]);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const ws = workbook.Sheets[sheetName];
      const { validos, invalidos, headersEncontrados } = parseClientesFromSheet(ws);

      setPreview(validos);
      setInvalidos(invalidos);
      setHeaders(headersEncontrados);

      if (!validos.length) {
        alert('Nenhum cliente válido encontrado no arquivo. Verifique o modelo e os dados.');
        return;
      }

      // Confirmação opcional antes de enviar
      const confirmar = confirm(`Encontramos ${validos.length} clientes válidos e ${invalidos.length} linhas inválidas. Deseja salvar no banco?`);
      if (!confirmar) return;

      const { inseridos, erros } = await inserirEmLotesSupabase(validos, 'clientes', 500);
      setResultado({ inseridos, erros: erros.length });

      if (erros.length) {
        console.error('Erros de inserção por lote:', erros);
        alert(`Importação concluída com erros. Inseridos: ${inseridos}. Lotes com erro: ${erros.length}. Veja o console para detalhes.`);
      } else {
        alert(`Importação concluída! Inseridos: ${inseridos}.`);
      }
    } catch (err: any) {
      console.error(err);
      alert('Erro ao processar o arquivo. Verifique o formato e tente novamente.');
    } finally {
      setLoading(false);
      // limpa o input para permitir reupload do mesmo arquivo
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Cadastro de Clientes em Lote</h1>
      <p className="text-sm text-gray-600 mb-4">
        Baixe o modelo de Excel, preencha os dados dos clientes e depois faça o upload para importar em lote.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={baixarModeloExcel}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={loading}
        >
          Baixar Modelo Excel
        </button>

        <label className="inline-flex items-center gap-2 px-4 py-2 border rounded cursor-pointer hover:bg-gray-50">
          <span>Selecionar arquivo</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleUpload}
            disabled={loading}
          />
        </label>
      </div>

      {loading && <p className="text-sm">Processando arquivo...</p>}

      {headers.length > 0 && (
        <div className="mb-3">
          <p className="text-sm text-gray-700">
            Cabeçalhos detectados: {headers.join(' | ')}
          </p>
          <p className="text-xs text-gray-
