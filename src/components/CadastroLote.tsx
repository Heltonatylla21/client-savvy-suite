import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { validateCPF } from '@/lib/validators';
import { Upload, Download, AlertCircle, CheckCircle } from 'lucide-react';

interface ClienteExcel {
  nome: string;
  cpf: string;
  idade?: number;
  telefone1: string;
  telefone2?: string;
  data_nascimento: string;
  wizebot?: string;
}

// Função para converter número serial do Excel para data
const excelSerialDateToDate = (serial: number): Date | null => {
  try {
    // Excel conta dias desde 30 de dezembro de 1899 (não 1 de janeiro de 1900)
    // Há um bug histórico no Excel que considera 1900 como ano bissexto
    const excelEpoch = new Date(1899, 11, 30); // 30 de dezembro de 1899
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const resultDate = new Date(excelEpoch.getTime() + (serial * millisecondsPerDay));
    
    // Verificar se a data é válida e razoável
    if (isNaN(resultDate.getTime())) return null;
    
    const year = resultDate.getFullYear();
    if (year < 1900 || year > 2100) return null;
    
    return resultDate;
  } catch (error) {
    console.log('Erro na conversão do Excel serial date:', error);
    return null;
  }
};

// Função melhorada para processar datas
const parseDateString = (dateInput: any): Date | null => {
  if (dateInput === null || dateInput === undefined || dateInput === '') return null;
  
  const input = String(dateInput).trim();
  console.log(`=== Processando data: "${input}" (tipo: ${typeof dateInput}) ===`);
  
  // Primeiro, tentar como número serial do Excel
  const numericValue = parseFloat(input);
  if (!isNaN(numericValue) && /^\d+(\.\d+)?$/.test(input)) {
    console.log(`Tentando como número serial do Excel: ${numericValue}`);
    
    // Verificar se é um número razoável para ser uma data serial do Excel
    if (numericValue >= 1 && numericValue <= 80000) { // Ampliado o range
      const excelDate = excelSerialDateToDate(numericValue);
      if (excelDate) {
        console.log(`✅ Data convertida do Excel: ${excelDate.toISOString()} (${excelDate.getDate()}/${excelDate.getMonth() + 1}/${excelDate.getFullYear()})`);
        return excelDate;
      }
    }
  }
  
  // Tentar formato DD/MM/AAAA ou DD/MM/AA
  if (input.includes('/')) {
    const parts = input.split('/');
    if (parts.length === 3) {
      let dia = parseInt(parts[0], 10);
      let mes = parseInt(parts[1], 10);
      let ano = parseInt(parts[2], 10);
      
      // Ajustar ano de 2 dígitos
      if (ano < 100) {
        ano += ano < 50 ? 2000 : 1900; // 00-49 = 2000-2049, 50-99 = 1950-1999
      }
      
      console.log(`Tentando formato DD/MM/AAAA - Dia: ${dia}, Mês: ${mes}, Ano: ${ano}`);
      
      // Validações básicas
      if (!isNaN(dia) && !isNaN(mes) && !isNaN(ano) &&
          dia >= 1 && dia <= 31 &&
          mes >= 1 && mes <= 12 &&
          ano >= 1900 && ano <= new Date().getFullYear() + 1) { // +1 para dar margem
        
        const date = new Date(ano, mes - 1, dia);
        
        // Verificar se a data é válida
        if (date.getFullYear() === ano && 
            date.getMonth() === (mes - 1) && 
            date.getDate() === dia) {
          console.log(`✅ Data criada com sucesso: ${date.toISOString()}`);
          return date;
        }
      }
    }
  }
  
  // Tentar outros formatos de data
  try {
    const date = new Date(input);
    if (!isNaN(date.getTime()) && date.getFullYear() >= 1900 && date.getFullYear() <= new Date().getFullYear()) {
      console.log(`✅ Data parseada diretamente: ${date.toISOString()}`);
      return date;
    }
  } catch (e) {
    console.log('Erro ao tentar parsear diretamente:', e);
  }
  
  console.log(`❌ Não foi possível parsear a data: "${input}"`);
  return null;
};

// Função para calcular a idade a partir da data de nascimento
const calculateAge = (birthDate: Date): number => {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

// Função para formatar data para o formato ISO (YYYY-MM-DD)
const formatDateToISO = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function CadastroLote() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{
    success: number;
    errors: Array<{ row: number; error: string; data: any }>;
  } | null>(null);

  const downloadTemplate = () => {
    const template = [
      {
        nome: 'João Silva',
        cpf: '12345678901',
        telefone1: '11999999999',
        telefone2: '1133333333',
        data_nascimento: '15/01/1994',
        wizebot: 'joao123'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    XLSX.writeFile(wb, 'template_clientes.xlsx');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResults(null);
    }
  };

  const processExcel = async () => {
    if (!file) return;

    setIsProcessing(true);
    setProgress(0);
    setResults(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data: any[] = XLSX.utils.sheet_to_json(worksheet);

      if (data.length === 0) {
        toast.error('Arquivo Excel está vazio');
        setIsProcessing(false);
        return;
      }

      const success: number[] = [];
      const errors: Array<{ row: number; error: string; data: any }> = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNumber = i + 2; // +2 porque começa na linha 2 do Excel

        try {
          // Validação dos campos obrigatórios
          if (!row.nome || !row.cpf || !row.telefone1 || !row.data_nascimento) {
            errors.push({
              row: rowNumber,
              error: 'Campos obrigatórios faltando (nome, cpf, telefone1, data_nascimento)',
              data: row
            });
            continue;
          }

          // Validar CPF
          const cpfString = String(row.cpf).trim();
          const cpfLimpo = cpfString.replace(/\D/g, '');
          if (!cpfLimpo || cpfLimpo.length !== 11 || !validateCPF(cpfLimpo)) {
            errors.push({
              row: rowNumber,
              error: `CPF inválido: ${cpfString}`,
              data: row
            });
            continue;
          }

          // Processar data de nascimento com a nova função
          const dataNascimento = parseDateString(row.data_nascimento);
          if (!dataNascimento) {
            errors.push({
              row: rowNumber,
              error: `Data de nascimento inválida: "${row.data_nascimento}". Use o formato DD/MM/AAAA (ex: 21/12/1993) ou configure a célula no Excel como Data`,
              data: row
            });
            continue;
          }

          // Validar se a data não é futura (com margem mais generosa)
          const hoje = new Date();
          const amanha = new Date(hoje.getTime() + (24 * 60 * 60 * 1000)); // +1 dia de margem
          
          if (dataNascimento > amanha) {
            const dataFormatada = `${dataNascimento.getDate().toString().padStart(2, '0')}/${(dataNascimento.getMonth() + 1).toString().padStart(2, '0')}/${dataNascimento.getFullYear()}`;
            errors.push({
              row: rowNumber,
              error: `Data de nascimento não pode ser no futuro. Data processada: ${dataFormatada} (valor original: "${row.data_nascimento}")`,
              data: row
            });
            continue;
          }

          // Validar idade mínima e máxima razoável
          const idadeCalculada = calculateAge(dataNascimento);
          if (idadeCalculada < 0 || idadeCalculada > 150) {
            const dataFormatada = `${dataNascimento.getDate().toString().padStart(2, '0')}/${(dataNascimento.getMonth() + 1).toString().padStart(2, '0')}/${dataNascimento.getFullYear()}`;
            errors.push({
              row: rowNumber,
              error: `Idade calculada inválida: ${idadeCalculada} anos (Data: ${dataFormatada})`,
              data: row
            });
            continue;
          }

          // Debug temporário
          console.log(`✅ Linha ${rowNumber}: Data original: "${row.data_nascimento}" → Data final: ${formatDateToISO(dataNascimento)} → Idade: ${idadeCalculada} anos`);

          // Preparar dados para inserção
          const clienteData: ClienteExcel = {
            nome: row.nome.toString().trim(),
            cpf: cpfLimpo,
            idade: idadeCalculada,
            telefone1: row.telefone1.toString().replace(/\D/g, ''),
            telefone2: row.telefone2 ? row.telefone2.toString().replace(/\D/g, '') : undefined,
            data_nascimento: formatDateToISO(dataNascimento),
            wizebot: row.wizebot ? row.wizebot.toString().trim() : undefined
          };

          // Inserir no banco
          const { error } = await supabase
            .from('clientes')
            .insert(clienteData);

          if (error) {
            errors.push({
              row: rowNumber,
              error: `Erro no banco: ${error.message}`,
              data: row
            });
          } else {
            success.push(rowNumber);
          }

        } catch (error) {
          errors.push({
            row: rowNumber,
            error: `Erro inesperado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
            data: row
          });
        }

        // Atualizar progresso
        setProgress(((i + 1) / data.length) * 100);
      }

      setResults({
        success: success.length,
        errors: errors
      });

      if (success.length > 0) {
        toast.success(`${success.length} clientes cadastrados com sucesso!`);
      }

      if (errors.length > 0) {
        toast.error(`${errors.length} registros com erro. Verifique os detalhes abaixo.`);
      }

    } catch (error) {
      toast.error('Erro ao processar arquivo Excel');
      console.error('Erro:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Cadastro em Lote
          </CardTitle>
          <CardDescription>
            Faça upload de um arquivo Excel para cadastrar múltiplos clientes de uma só vez
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Template Download */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div>
              <h3 className="font-medium">Template Excel</h3>
              <p className="text-sm text-muted-foreground">
                Baixe o modelo com as colunas corretas
              </p>
            </div>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Baixar Template
            </Button>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="excel-file">Arquivo Excel</Label>
            <Input
              id="excel-file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={isProcessing}
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                Arquivo selecionado: {file.name}
              </p>
            )}
          </div>

          {/* Process Button */}
          <Button 
            onClick={processExcel} 
            disabled={!file || isProcessing}
            className="w-full"
          >
            {isProcessing ? 'Processando...' : 'Processar Arquivo'}
          </Button>

          {/* Progress */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processando...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Results */}
          {results && (
            <div className="space-y-4">
              {results.success > 0 && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{results.success} clientes</strong> cadastrados com sucesso!
                  </AlertDescription>
                </Alert>
              )}

              {results.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{results.errors.length} registros</strong> com erro:
                    <div className="mt-2 max-h-40 overflow-y-auto">
                      {results.errors.map((error, index) => (
                        <div key={index} className="text-xs mt-1 p-2 bg-background rounded">
                          <strong>Linha {error.row}:</strong> {error.error}
                          <br />
                          <span className="text-muted-foreground">
                            Nome: {error.data.nome || 'N/A'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Instruções</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>Colunas obrigatórias:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>nome:</strong> Nome completo do cliente</li>
              <li><strong>cpf:</strong> CPF (apenas números ou com formatação)</li>
              <li><strong>telefone1:</strong> Telefone principal</li>
              <li><strong>data_nascimento:</strong> Data no formato DD/MM/AAAA (ex: 21/12/1993)</li>
            </ul>
            
            <p className="mt-4"><strong>Colunas opcionais:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>telefone2:</strong> Telefone secundário</li>
              <li><strong>wizebot:</strong> Informações do Wizebot</li>
            </ul>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p><strong>⚠️ Importante sobre datas:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                <li>Use o formato <strong>DD/MM/AAAA</strong> (ex: 21/12/1993)</li>
                <li><strong>Configure a coluna no Excel como "Texto"</strong> antes de inserir as datas</li>
                <li>Se a célula estiver formatada como Data no Excel, o sistema tentará converter automaticamente</li>
                <li>O campo "idade" será calculado automaticamente</li>
                <li>Datas inválidas (como 31/02/2023) serão rejeitadas</li>
                <li>Datas futuras não são permitidas</li>
              </ul>
              <div className="mt-2 p-2 bg-yellow-50 rounded border-l-4 border-yellow-400">
                <p className="text-sm"><strong>Dica:</strong> Se estiver com problemas de formatação, salve o Excel como CSV e abra novamente, ou formate a coluna de data como "Texto" antes de inserir os valores.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { validateCPF } from '@/lib/validators';
import { Upload, Download, AlertCircle, CheckCircle } from 'lucide-react';

interface ClienteExcel {
  nome: string;
  cpf: string;
  idade?: number;
  telefone1: string;
  telefone2?: string;
  data_nascimento: string;
  wizebot?: string;
}

// Função para converter número serial do Excel para data
const excelSerialDateToDate = (serial: number): Date | null => {
  try {
    // Excel conta dias desde 30 de dezembro de 1899 (não 1 de janeiro de 1900)
    // Há um bug histórico no Excel que considera 1900 como ano bissexto
    const excelEpoch = new Date(1899, 11, 30); // 30 de dezembro de 1899
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const resultDate = new Date(excelEpoch.getTime() + (serial * millisecondsPerDay));
    
    // Verificar se a data é válida e razoável
    if (isNaN(resultDate.getTime())) return null;
    
    const year = resultDate.getFullYear();
    if (year < 1900 || year > 2100) return null;
    
    return resultDate;
  } catch (error) {
    console.log('Erro na conversão do Excel serial date:', error);
    return null;
  }
};

// Função melhorada para processar datas
const parseDateString = (dateInput: any): Date | null => {
  if (dateInput === null || dateInput === undefined || dateInput === '') return null;
  
  const input = String(dateInput).trim();
  console.log(`=== Processando data: "${input}" (tipo: ${typeof dateInput}) ===`);
  
  // Primeiro, tentar como número serial do Excel
  const numericValue = parseFloat(input);
  if (!isNaN(numericValue) && /^\d+(\.\d+)?$/.test(input)) {
    console.log(`Tentando como número serial do Excel: ${numericValue}`);
    
    // Verificar se é um número razoável para ser uma data serial do Excel
    if (numericValue >= 1 && numericValue <= 80000) { // Ampliado o range
      const excelDate = excelSerialDateToDate(numericValue);
      if (excelDate) {
        console.log(`✅ Data convertida do Excel: ${excelDate.toISOString()} (${excelDate.getDate()}/${excelDate.getMonth() + 1}/${excelDate.getFullYear()})`);
        return excelDate;
      }
    }
  }
  
  // Tentar formato DD/MM/AAAA ou DD/MM/AA
  if (input.includes('/')) {
    const parts = input.split('/');
    if (parts.length === 3) {
      let dia = parseInt(parts[0], 10);
      let mes = parseInt(parts[1], 10);
      let ano = parseInt(parts[2], 10);
      
      // Ajustar ano de 2 dígitos
      if (ano < 100) {
        ano += ano < 50 ? 2000 : 1900; // 00-49 = 2000-2049, 50-99 = 1950-1999
      }
      
      console.log(`Tentando formato DD/MM/AAAA - Dia: ${dia}, Mês: ${mes}, Ano: ${ano}`);
      
      // Validações básicas
      if (!isNaN(dia) && !isNaN(mes) && !isNaN(ano) &&
          dia >= 1 && dia <= 31 &&
          mes >= 1 && mes <= 12 &&
          ano >= 1900 && ano <= new Date().getFullYear() + 1) { // +1 para dar margem
        
        const date = new Date(ano, mes - 1, dia);
        
        // Verificar se a data é válida
        if (date.getFullYear() === ano && 
            date.getMonth() === (mes - 1) && 
            date.getDate() === dia) {
          console.log(`✅ Data criada com sucesso: ${date.toISOString()}`);
          return date;
        }
      }
    }
  }
  
  // Tentar outros formatos de data
  try {
    const date = new Date(input);
    if (!isNaN(date.getTime()) && date.getFullYear() >= 1900 && date.getFullYear() <= new Date().getFullYear()) {
      console.log(`✅ Data parseada diretamente: ${date.toISOString()}`);
      return date;
    }
  } catch (e) {
    console.log('Erro ao tentar parsear diretamente:', e);
  }
  
  console.log(`❌ Não foi possível parsear a data: "${input}"`);
  return null;
};

// Função para calcular a idade a partir da data de nascimento
const calculateAge = (birthDate: Date): number => {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

// Função para formatar data para o formato ISO (YYYY-MM-DD)
const formatDateToISO = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function CadastroLote() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{
    success: number;
    errors: Array<{ row: number; error: string; data: any }>;
  } | null>(null);

  const downloadTemplate = () => {
    const template = [
      {
        nome: 'João Silva',
        cpf: '12345678901',
        telefone1: '11999999999',
        telefone2: '1133333333',
        data_nascimento: '15/01/1994',
        wizebot: 'joao123'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    XLSX.writeFile(wb, 'template_clientes.xlsx');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResults(null);
    }
  };

  const processExcel = async () => {
    if (!file) return;

    setIsProcessing(true);
    setProgress(0);
    setResults(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data: any[] = XLSX.utils.sheet_to_json(worksheet);

      if (data.length === 0) {
        toast.error('Arquivo Excel está vazio');
        setIsProcessing(false);
        return;
      }

      const success: number[] = [];
      const errors: Array<{ row: number; error: string; data: any }> = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNumber = i + 2; // +2 porque começa na linha 2 do Excel

        try {
          // Validação dos campos obrigatórios
          if (!row.nome || !row.cpf || !row.telefone1 || !row.data_nascimento) {
            errors.push({
              row: rowNumber,
              error: 'Campos obrigatórios faltando (nome, cpf, telefone1, data_nascimento)',
              data: row
            });
            continue;
          }

          // Validar CPF
          const cpfString = String(row.cpf).trim();
          const cpfLimpo = cpfString.replace(/\D/g, '');
          if (!cpfLimpo || cpfLimpo.length !== 11 || !validateCPF(cpfLimpo)) {
            errors.push({
              row: rowNumber,
              error: `CPF inválido: ${cpfString}`,
              data: row
            });
            continue;
          }

          // Processar data de nascimento com a nova função
          const dataNascimento = parseDateString(row.data_nascimento);
          if (!dataNascimento) {
            errors.push({
              row: rowNumber,
              error: `Data de nascimento inválida: "${row.data_nascimento}". Use o formato DD/MM/AAAA (ex: 21/12/1993) ou configure a célula no Excel como Data`,
              data: row
            });
            continue;
          }

          // Validar se a data não é futura (com margem mais generosa)
          const hoje = new Date();
          const amanha = new Date(hoje.getTime() + (24 * 60 * 60 * 1000)); // +1 dia de margem
          
          if (dataNascimento > amanha) {
            const dataFormatada = `${dataNascimento.getDate().toString().padStart(2, '0')}/${(dataNascimento.getMonth() + 1).toString().padStart(2, '0')}/${dataNascimento.getFullYear()}`;
            errors.push({
              row: rowNumber,
              error: `Data de nascimento não pode ser no futuro. Data processada: ${dataFormatada} (valor original: "${row.data_nascimento}")`,
              data: row
            });
            continue;
          }

          // Validar idade mínima e máxima razoável
          const idadeCalculada = calculateAge(dataNascimento);
          if (idadeCalculada < 0 || idadeCalculada > 150) {
            const dataFormatada = `${dataNascimento.getDate().toString().padStart(2, '0')}/${(dataNascimento.getMonth() + 1).toString().padStart(2, '0')}/${dataNascimento.getFullYear()}`;
            errors.push({
              row: rowNumber,
              error: `Idade calculada inválida: ${idadeCalculada} anos (Data: ${dataFormatada})`,
              data: row
            });
            continue;
          }

          // Debug temporário
          console.log(`✅ Linha ${rowNumber}: Data original: "${row.data_nascimento}" → Data final: ${formatDateToISO(dataNascimento)} → Idade: ${idadeCalculada} anos`);

          // Preparar dados para inserção
          const clienteData: ClienteExcel = {
            nome: row.nome.toString().trim(),
            cpf: cpfLimpo,
            idade: idadeCalculada,
            telefone1: row.telefone1.toString().replace(/\D/g, ''),
            telefone2: row.telefone2 ? row.telefone2.toString().replace(/\D/g, '') : undefined,
            data_nascimento: formatDateToISO(dataNascimento),
            wizebot: row.wizebot ? row.wizebot.toString().trim() : undefined
          };

          // Inserir no banco
          const { error } = await supabase
            .from('clientes')
            .insert(clienteData);

          if (error) {
            errors.push({
              row: rowNumber,
              error: `Erro no banco: ${error.message}`,
              data: row
            });
          } else {
            success.push(rowNumber);
          }

        } catch (error) {
          errors.push({
            row: rowNumber,
            error: `Erro inesperado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
            data: row
          });
        }

        // Atualizar progresso
        setProgress(((i + 1) / data.length) * 100);
      }

      setResults({
        success: success.length,
        errors: errors
      });

      if (success.length > 0) {
        toast.success(`${success.length} clientes cadastrados com sucesso!`);
      }

      if (errors.length > 0) {
        toast.error(`${errors.length} registros com erro. Verifique os detalhes abaixo.`);
      }

    } catch (error) {
      toast.error('Erro ao processar arquivo Excel');
      console.error('Erro:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Cadastro em Lote
          </CardTitle>
          <CardDescription>
            Faça upload de um arquivo Excel para cadastrar múltiplos clientes de uma só vez
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Template Download */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div>
              <h3 className="font-medium">Template Excel</h3>
              <p className="text-sm text-muted-foreground">
                Baixe o modelo com as colunas corretas
              </p>
            </div>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Baixar Template
            </Button>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="excel-file">Arquivo Excel</Label>
            <Input
              id="excel-file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={isProcessing}
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                Arquivo selecionado: {file.name}
              </p>
            )}
          </div>

          {/* Process Button */}
          <Button 
            onClick={processExcel} 
            disabled={!file || isProcessing}
            className="w-full"
          >
            {isProcessing ? 'Processando...' : 'Processar Arquivo'}
          </Button>

          {/* Progress */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processando...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Results */}
          {results && (
            <div className="space-y-4">
              {results.success > 0 && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{results.success} clientes</strong> cadastrados com sucesso!
                  </AlertDescription>
                </Alert>
              )}

              {results.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{results.errors.length} registros</strong> com erro:
                    <div className="mt-2 max-h-40 overflow-y-auto">
                      {results.errors.map((error, index) => (
                        <div key={index} className="text-xs mt-1 p-2 bg-background rounded">
                          <strong>Linha {error.row}:</strong> {error.error}
                          <br />
                          <span className="text-muted-foreground">
                            Nome: {error.data.nome || 'N/A'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Instruções</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>Colunas obrigatórias:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>nome:</strong> Nome completo do cliente</li>
              <li><strong>cpf:</strong> CPF (apenas números ou com formatação)</li>
              <li><strong>telefone1:</strong> Telefone principal</li>
              <li><strong>data_nascimento:</strong> Data no formato DD/MM/AAAA (ex: 21/12/1993)</li>
            </ul>
            
            <p className="mt-4"><strong>Colunas opcionais:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>telefone2:</strong> Telefone secundário</li>
              <li><strong>wizebot:</strong> Informações do Wizebot</li>
            </ul>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p><strong>⚠️ Importante sobre datas:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                <li>Use o formato <strong>DD/MM/AAAA</strong> (ex: 21/12/1993)</li>
                <li><strong>Configure a coluna no Excel como "Texto"</strong> antes de inserir as datas</li>
                <li>Se a célula estiver formatada como Data no Excel, o sistema tentará converter automaticamente</li>
                <li>O campo "idade" será calculado automaticamente</li>
                <li>Datas inválidas (como 31/02/2023) serão rejeitadas</li>
                <li>Datas futuras não são permitidas</li>
              </ul>
              <div className="mt-2 p-2 bg-yellow-50 rounded border-l-4 border-yellow-400">
                <p className="text-sm"><strong>Dica:</strong> Se estiver com problemas de formatação, salve o Excel como CSV e abra novamente, ou formate a coluna de data como "Texto" antes de inserir os valores.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
