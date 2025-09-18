// Cole esta função `processExcel` no lugar da antiga em seu arquivo.
// O resto do código pode permanecer o mesmo.

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

        const errors: Array<{ row: number; error: string; data: any }> = [];
        const clientesParaInserir: ClienteExcel[] = []; // Array para guardar os dados válidos

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const rowNumber = i + 2;

            // --- Validações (mesmo código de antes) ---
            if (!row.nome || !row.cpf || !row.telefone1 || !row.data_nascimento) {
                errors.push({ row: rowNumber, error: 'Campos obrigatórios faltando', data: row });
                continue;
            }

            const cpfString = String(row.cpf).trim();
            const cpfLimpo = cpfString.replace(/\D/g, '');
            if (!cpfLimpo || cpfLimpo.length !== 11 || !validateCPF(cpfLimpo)) {
                errors.push({ row: rowNumber, error: 'CPF inválido', data: row });
                continue;
            }

            let dataNascimentoString: string;
            const dataString = String(row.data_nascimento).trim();
            if (dataString.includes('/')) {
                const [dia, mes, ano] = dataString.split('/');
                if (dia?.length === 2 && mes?.length === 2 && ano?.length === 4) {
                    dataNascimentoString = `${ano}-${mes}-${dia}`;
                } else {
                    errors.push({ row: rowNumber, error: 'Formato de data inválido. Use DD/MM/AAAA.', data: row });
                    continue;
                }
            } else if (dataString.match(/^\d{4}-\d{2}-\d{2}$/)) {
                dataNascimentoString = dataString;
            } else {
                errors.push({ row: rowNumber, error: 'Formato de data não reconhecido. Use DD/MM/AAAA.', data: row });
                continue;
            }

            if (isNaN(new Date(dataNascimentoString).getTime())) {
                errors.push({ row: rowNumber, error: 'Data de nascimento inválida.', data: row });
                continue;
            }

            const calculatedAge = calculateAge(dataNascimentoString);
            if (calculatedAge === null || isNaN(calculatedAge)) {
                errors.push({ row: rowNumber, error: 'Não foi possível calcular a idade.', data: row });
                continue;
            }
            // --- Fim das Validações ---

            // Adiciona o cliente válido ao array para inserção em lote
            clientesParaInserir.push({
                nome: row.nome.toString().trim(),
                cpf: cpfLimpo,
                idade: calculatedAge,
                telefone1: row.telefone1.toString().replace(/\D/g, ''),
                telefone2: row.telefone2 ? row.telefone2.toString().replace(/\D/g, '') : undefined,
                data_nascimento: dataNascimentoString,
                wizebot: row.wizebot ? row.wizebot.toString().trim() : undefined
            });
            
            // Atualiza o progresso visualmente (não afeta mais a lógica de inserção)
            setProgress(((i + 1) / data.length) * 100);
        }

        // --- INSERÇÃO EM LOTE ---
        // Se houver clientes válidos, insere todos de uma vez
        if (clientesParaInserir.length > 0) {
            const { error: insertError } = await supabase
                .from('clientes')
                .insert(clientesParaInserir); // Envia o array completo

            if (insertError) {
                // Se a inserção em lote falhar, é um erro geral.
                // Não saberemos qual linha falhou, então adicionamos um erro genérico.
                toast.error(`Erro ao salvar no banco: ${insertError.message}`);
                // Adiciona todas as linhas que tentamos inserir à lista de erros para o usuário revisar.
                clientesParaInserir.forEach((cliente, index) => {
                    errors.push({
                        row: data.findIndex(d => d.cpf === cliente.cpf) + 2, // Tenta encontrar a linha original
                        error: `Falha na inserção em lote. Verifique os dados. (${insertError.message})`,
                        data: cliente
                    });
                });
            } else {
                toast.success(`${clientesParaInserir.length} clientes cadastrados com sucesso!`);
            }
        }

        setResults({
            success: clientesParaInserir.length > 0 ? clientesParaInserir.length : 0,
            errors: errors
        });

        if (errors.length > 0 && clientesParaInserir.length === 0) {
            toast.error(`${errors.length} registros com erro. Nenhum cliente foi cadastrado.`);
        } else if (errors.length > 0) {
            toast.warn(`${errors.length} registros com erro não foram cadastrados. Verifique os detalhes.`);
        }

    } catch (error) {
        toast.error('Erro crítico ao processar arquivo Excel.');
        console.error('Erro:', error);
    } finally {
        setIsProcessing(false);
        setProgress(100); // Garante que a barra de progresso chegue ao fim
    }
};
