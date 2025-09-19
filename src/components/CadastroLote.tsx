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
