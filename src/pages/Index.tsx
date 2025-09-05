import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CadastroCliente from "@/components/CadastroCliente";
import ConsultaClientes from "@/components/ConsultaClientes";
import Aniversariantes from "@/components/Aniversariantes";
import { Users, Search, Calendar } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background p-4">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Sistema de Consulta de Clientes</h1>
        <p className="text-muted-foreground">Gerencie seus clientes de forma simples e eficiente</p>
      </header>

      <Tabs defaultValue="cadastro" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cadastro" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Cadastro
          </TabsTrigger>
          <TabsTrigger value="consulta" className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Consulta
          </TabsTrigger>
          <TabsTrigger value="aniversariantes" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Aniversariantes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cadastro" className="mt-6">
          <CadastroCliente />
        </TabsContent>

        <TabsContent value="consulta" className="mt-6">
          <ConsultaClientes />
        </TabsContent>

        <TabsContent value="aniversariantes" className="mt-6">
          <Aniversariantes />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
