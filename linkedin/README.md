# linkedin/

Pasta de entrada do PDF exportado pelo LinkedIn (perfil → **Recursos/Mais** → **Salvar como PDF**).

**Opção A — local (recomendada, o PDF nunca sai do seu computador)**

```bash
cp ~/Downloads/Profile.pdf linkedin/
npm run linkedin:import      # gera src/data/linkedin.json
npm run dev                  # confira o resultado
git add src/data/linkedin.json && git commit -m "chore(data): atualiza LinkedIn" && git push
```

`linkedin/*.pdf` está no `.gitignore`, então o PDF não é commitado por engano.

**Opção B — direto no GitHub**

No site do GitHub: *Add file → Upload files* → envie o `Profile.pdf` para esta pasta.
O workflow **Import LinkedIn profile** converte, apaga o PDF e publica o site.
Atenção: o PDF contém seu telefone e e-mail e fica no histórico do Git (mesmo depois de apagado).
Em repositório público, prefira a opção A.
