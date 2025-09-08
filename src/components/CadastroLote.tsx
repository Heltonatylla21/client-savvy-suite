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
  idade: number;
  telefone1: string;
  telefone2?: string;
  data_nascimento: string;
  wizebot?: string;
}

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
        idade: 30,
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
          // Validação dos dados
          if (!row.nome || !row.cpf || !row.idade || !row.telefone1 || !row.data_nascimento) {
            errors.push({
              row: rowNumber,
              error: 'Campos obrigatórios faltando (nome, cpf, idade, telefone1, data_nascimento)',
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
              error: 'CPF inválido',
              data: row
            });
            continue;
          }

          // Validar data de nascimento (aceita formatos DD/MM/AAAA e AAAA-MM-DD)
          let dataNascimento: Date;
          const dataString = String(row.data_nascimento).trim();
          
          if (dataString.includes('/')) {
            // Formato brasileiro DD/MM/AAAA
            const [dia, mes, ano] = dataString.split('/');
            dataNascimento = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
          } else {
            // Formato ISO AAAA-MM-DD
            dataNascimento = new Date(dataString);
          }
          
          if (isNaN(dataNascimento.getTime())) {
            errors.push({
              row: rowNumber,
              error: 'Data de nascimento inválida',
              data: row
            });
            continue;
          }

          // Preparar dados para inserção
          const clienteData: ClienteExcel = {
            nome: row.nome.toString().trim(),
            cpf: cpfLimpo,
            idade: parseInt(row.idade),
            telefone1: row.telefone1.toString().replace(/\D/g, ''),
            telefone2: row.telefone2 ? row.telefone2.toString().replace(/\D/g, '') : undefined,
            data_nascimento: dataNascimento.toISOString().split('T')[0],
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
              <li><strong>idade:</strong> Idade em números</li>
              <li><strong>telefone1:</strong> Telefone principal</li>
              <li><strong>data_nascimento:</strong> Data no formato DD/MM/AAAA (ex: 15/01/1990)</li>
            </ul>
            
            <p className="mt-4"><strong>Colunas opcionais:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>telefone2:</strong> Telefone secundário</li>
              <li><strong>wizebot:</strong> Informações do Wizebot</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}