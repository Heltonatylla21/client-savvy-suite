import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { validateCPF, formatCPF, formatPhone } from "@/lib/validators";
import { UserPlus } from "lucide-react";

const CadastroCliente = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    cpf: "",
    idade: "",
    telefone1: "",
    telefone2: "",
    wizebot: "",
    dataNascimento: ""
  });

  const handleInputChange = (field: string, value: string) => {
    let formattedValue = value;
    
    if (field === "cpf") {
      formattedValue = formatCPF(value);
    } else if (field === "telefone1" || field === "telefone2") {
      formattedValue = formatPhone(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: formattedValue
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateCPF(formData.cpf)) {
      toast({
        title: "CPF Inválido",
        description: "Por favor, insira um CPF válido.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('clientes')
        .insert({
          nome: formData.nome,
          cpf: formData.cpf.replace(/\D/g, ''), // Remove formatting for storage
          idade: parseInt(formData.idade),
          telefone1: formData.telefone1.replace(/\D/g, ''),
          telefone2: formData.telefone2 ? formData.telefone2.replace(/\D/g, '') : null,
          wizebot: formData.wizebot || null,
          data_nascimento: formData.dataNascimento
        });

      if (error) throw error;

      toast({
        title: "Cliente Cadastrado",
        description: "Cliente cadastrado com sucesso!",
      });

      // Reset form
      setFormData({
        nome: "",
        cpf: "",
        idade: "",
        telefone1: "",
        telefone2: "",
        wizebot: "",
        dataNascimento: ""
      });
    } catch (error: any) {
      toast({
        title: "Erro ao Cadastrar",
        description: error.message || "Ocorreu um erro ao cadastrar o cliente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Cadastro de Cliente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => handleInputChange("nome", e.target.value)}
                placeholder="Nome completo"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="cpf">CPF *</Label>
              <Input
                id="cpf"
                value={formData.cpf}
                onChange={(e) => handleInputChange("cpf", e.target.value)}
                placeholder="000.000.000-00"
                maxLength={14}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="idade">Idade *</Label>
              <Input
                id="idade"
                type="number"
                value={formData.idade}
                onChange={(e) => handleInputChange("idade", e.target.value)}
                placeholder="Idade"
                min="1"
                max="120"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="dataNascimento">Data de Nascimento *</Label>
              <Input
                id="dataNascimento"
                type="date"
                value={formData.dataNascimento}
                onChange={(e) => handleInputChange("dataNascimento", e.target.value)}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="telefone1">Telefone 1 *</Label>
              <Input
                id="telefone1"
                value={formData.telefone1}
                onChange={(e) => handleInputChange("telefone1", e.target.value)}
                placeholder="(00) 00000-0000"
                maxLength={15}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="telefone2">Telefone 2</Label>
              <Input
                id="telefone2"
                value={formData.telefone2}
                onChange={(e) => handleInputChange("telefone2", e.target.value)}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </div>
            
            <div className="md:col-span-2">
              <Label htmlFor="wizebot">Wizebot</Label>
              <Input
                id="wizebot"
                value={formData.wizebot}
                onChange={(e) => handleInputChange("wizebot", e.target.value)}
                placeholder="Informações do Wizebot"
              />
            </div>
          </div>
          
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Cadastrando..." : "Cadastrar Cliente"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CadastroCliente;