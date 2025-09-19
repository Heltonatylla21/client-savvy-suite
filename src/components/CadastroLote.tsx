import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../integrations/supabase/client';
interface Cliente {
  nome: string;
  email: string;
  telefone: string;
}
export function CadastroLote() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  // Modelo de dados para o Excel (cabeçalho + exemplo)
  const modeloExcel = [
    ['nome', 'email', 'telefone'],
    ['João Silva', 'joao@email.com', '11999999999'],
    ['Maria Souza', 'maria@email.com', '11988888888'],
  ];
  // Gera e baixa o arquivo modelo Excel
  const baixarModelo = () => {
    const ws = XLSX.utils.aoa_to_sheet(modeloExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ModeloClientes');
    XLSX.writeFile(wb, 'modelo_cadastro_clientes.xlsx');
  };
  // Validação simples dos dados do cliente
  const validarCliente = (cliente: Cliente) => {
    if (!cliente.nome || !cliente.email) return false;
    // Pode adicionar regex para email, telefone, etc.
    return true;
  };
  // Upload e processamento do arquivo Excel
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
      return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Cadastro em Lote</h1>
      <button
        onClick={baixarModelo}
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        disabled={loading}
      >
        Baixar Modelo Excel
      </button>
      <input
        type="file"
        accept=".xlsx, .xls"
        onChange={handleUpload}
        disabled={loading}
        className="mb-4"
      />
      {loading && <p>Processando arquivo...</p>}
      {clientes.length > 0 && (
        <>
          <h2 className="text-xl font-semibold mb-2">Clientes Importados:</h2>
          <ul className="list-disc pl-5">
            {clientes.map((cliente, i) => (
              <li key={i}>
                {cliente.nome} - {cliente.email} - {cliente.telefone}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

