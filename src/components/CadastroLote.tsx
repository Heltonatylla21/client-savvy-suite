import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { validateCPF, formatCPF, formatPhone } from "@/lib/validators";
import { UserPlus, Upload, FileInput } from "lucide-react";
import * as XLSX from 'xlsx';

// Função para calcular a idade a partir da data de nascimento
const calculateAge = (birthDateString: string): number | null => {
  if (!birthDateString) return null;
  const today = new Date();
  const birthDate = new Date(birthDateString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const CadastroLote = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
  };

  const handleImport = async () => {
    if (!file) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Por favor, selecione um arquivo Excel para importar.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);

      const clientsToInsert = [];
      const errors = [];

      for (const row of json) {
        const nome = row.Nome;
        const cpf = row.CPF?.toString().replace(/\D/g, '');
        const dataNascimentoExcel = row["Data de Nascimento"]?.toString();
        const telefone1 = row["Telefone 1"]?.toString().replace(/\D/g, '');
        const telefone2 = row["Telefone 2"]?.toString().replace(/\D/g, '') || null;
        const wizebot = row.Wizebot || null;
        
        // Validation
        if (!nome || !cpf || !dataNascimentoExcel || !telefone1) {
          errors.push(`Registro inválido (dados incompletos): ${JSON.stringify(row)}`);
          continue;
        }

        if (!validateCPF(cpf)) {
          errors.push(`CPF inválido: ${cpf}`);
          continue;
        }
        
        let dataNascimento;
        try {
          const [day, month, year] = dataNascimentoExcel.split('/');
          dataNascimento = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        } catch {
          errors.push(`Data de nascimento inválida: ${dataNascimentoExcel}`);
          continue;
        }

        const idade = calculateAge(dataNascimento);

        if (idade === null || isNaN(idade)) {
          errors.push(`Não foi possível calcular a idade para o cliente ${nome}. Verifique a data de nascimento: ${dataNascimentoExcel}`);
          continue;
        }

        clientsToInsert.push({
          nome,
          cpf,
          data_nascimento: dataNascimento,
          idade,
          telefone1,
          telefone2,
          wizebot
        });
      }

      if (clientsToInsert.length > 0) {
        const { error } = await supabase
          .from('clientes')
          .insert(clientsToInsert);

        if (error) throw error;
      }
      
      toast({
        title: "Importação concluída",
        description: `Foram cadastrados ${clientsToInsert.length} clientes. ${errors.length > 0 ? `Com ${errors.length} erros.` : ''}`,
      });

      if (errors.length > 0) {
        console.error("Erros de importação:", errors);
      }

      // Limpar formulário
      setFile(null);

    } catch (error: any) {
      toast({
        title: "Erro ao importar",
        description: error.message || "Ocorreu um erro ao processar o arquivo.",
        variant: "destructive"
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Cadastro de Clientes em Lote
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="excel-file">Selecione o arquivo Excel</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                id="excel-file"
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
              <Button onClick={handleImport} disabled={loading || !file}>
                {loading ? "Importando..." : "Importar"}
                <FileInput className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
          {file && (
            <p className="text-sm text-muted-foreground">
              Arquivo selecionado: {file.name}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CadastroLote;
