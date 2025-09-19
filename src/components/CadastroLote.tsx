Activate E2E Encryption

New

Share




New Chat
140 lines

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
