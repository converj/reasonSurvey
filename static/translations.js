
const englishToTranslations = {
  // Menus
  'New Survey': { es:'Nueva encuesta' , cn:'新问卷调查' , nl:'Nieuwe enquête' , fr:'Nouvelle enquête' , pt:'Nova pesquisa' } ,
  'Menu': { es:'Menú' , cn:'菜单' , nl:'Menu' , fr:'Menu' , pt:'Cardápio' } ,
  'Proposals': { es:'Propuestas' , cn:'提案' , nl:'Voorstellen' , fr:'Les propositions' , pt:'Propostas' } ,
  'Results': { es:'Resultados' , cn:'结果' , nl:'Resultaten' , fr:'Résultats' , pt:'Resultados' } ,
  'View': { es:'Vista' , cn:'看法' , nl:'Weergave' , fr:'Voir' , pt:'Visualizar' } ,
  'Edit': { es:'Editar' , cn:'编辑' , nl:'Bewerking' , fr:'Modifier' , pt:'Editar' } ,
  'Recent': { es:'Reciente' , cn:'最近的' , nl:'Recent' , fr:'Récent' , pt:'Recente' } ,
  'About': { es:'Sobre' , cn:'关于' , nl:'Over' , fr:'À propos' , pt:'Sobre' } ,
  'Log in': { es:'Acceso' , cn:'登录' , nl:'Log in' , fr:'Connexion' , pt:'Conecte-se' } ,
  'Log out': { es:'Cerrar sesión' , cn:'登出' , nl:'Uitloggen' , fr:'Se déconnecter' , pt:'Sair' } ,

  // Status messages
  'Browser login only': { 
    es:'Solo inicio de sesión del navegador' , cn:'仅浏览器登录' , nl:'Alleen browser-login' , fr:'Connexion au navigateur uniquement'  , 
    pt:'Somente login do navegador'  } ,
  'Freezing': { es:'Congelación' , cn:'冷冻' , nl:'Bevriezing' , fr:'Gelé' , pt:'Congelando' } ,
  'Frozen': { es:'Congelado' , cn:'冻结的' , nl:'Bevroren' , fr:'Congelé' , pt:'Congeladas' } ,
  '(frozen)': { es:'(congelado)' , cn:'(冻结的)' , nl:'(bevroren)' , fr:'(congelé)' , pt:'congeladas' } ,
  '(frozen proposals)': { es:'(propuestas congeladas)' , cn:'(冻结提案)' , nl:'(bevroren voorstellen)' , fr:'(propositions gelées)' , 
    pt:'(propostas congeladas)'  } ,
  '(reasons hidden)': { es:'(razones ocultas)' , cn:'(隐藏的原因)' , nl:'(redenen verborgen)' , fr:'(raisons cachées)' , 
    pt:'(razões escondidas)'  } ,
  'Unfreezing': { es:'Descongelación' , cn:'解冻' , nl:'Ontdooien' , fr:'Déblocage' , pt:'Descongelando' } ,
  'Unfrozen': { es:'Descongelado' , cn:'可更改' , nl:'Onbevroren' , fr:'Dégelé' , pt:'Descongelado' } ,
  'Froze survey': { es:'Encuesta congelada' , cn:'冻结调查' , nl:'Bevroren enquête' , fr:'Sondage enregistré' , pt:'Pesquisa congelada' } ,
  'Unfroze survey': { es:'Encuesta descongelada' , cn:'解冻调查' , nl:'Ontdooid onderzoek' , fr:'Enquête dégelée' , pt:'Pesquisa descongelada' } ,
  'Saved survey': { es:'Encuesta guardada' , cn:'保存的调查' , nl:'Opgeslagen enquête' , fr:'Sondage enregistré' , pt:'Pesquisa salva' } ,

  // Recent
  'Request for proposals': { es:'Solicitud de propuestas' , cn:'提交提案' , nl:'Verzoek om voorstellen' , fr:'Demande de propositions' , 
    pt:'Pedido de propostas'  } ,
  'Request for Proposals': { es:'Solicitud De Propuestas' , cn:'提交提案' , nl:'Verzoek om Voorstellen' , fr:'Demande de Propositions' , 
    pt:'Pedido de Propostas'  } ,
  'Participatory budget': { es:'Presupuesto participativo' , cn:'参与式预算' , nl:'Participatief budget' , fr:'Budget participatif' , 
    pt:'Orçamento participativo'  } ,
  'Participatory Budget': { es:'Presupuesto Participativo' , cn:'参与式预算' , nl:'Participatief Budget' , fr:'Budget Participatif' , 
    pt:'Orçamento Participativo'  } ,
  'Proposal pro/con': { es:'Propuesta a favor / en contra' , cn:'提案优缺点' , nl:'Voorstel voor en tegen' , fr:'Proposition pour et contre' , 
    pt:'Proposta pró e contra'  } ,
  'Proposal Pro &amp; Con': { es:'Propuesta A Favor Y En Contra' , cn:'提案的优缺点' , nl:'Voorstel Pro en Con' , fr:'Proposition pour et contre' , 
    pt:'Proposta Pró e Contra'  } ,
  'Auto-complete survey': {
    es:'Autocompletar encuesta' , cn:'自动完成问卷调查' , nl:'Enquête automatisch aanvullen' , fr:'Sondage à saisie automatique'  , 
    pt:'Pesquisa de preenchimento automático'  } ,
  'Auto-complete Survey': { 
    es:'Autocompletar Encuesta' , cn:'自动完成问卷调查' , nl:'Enquête Automatisch Aanvullen' , fr:'Sondage à Saisie Automatique'  , 
    pt:'Pesquisa de preenchimento automático'  } ,

  // Main
  'Reason-Based Surveys': {
    es:'Encuestas Basadas en Razones' , cn:'基于原因的调查' , nl:'Op Redenen Gebaseerde Enquêtes' , fr:'Enquêtes Basées sur la Raison'  , 
    pt:'Pesquisas Baseadas em Razões'  } ,
  'Reason-based discussion helps people to better understand their own ideas, and opposing ideas.': {
    es:'La discusión basada en la razón ayuda a las personas a comprender mejor sus propias ideas y las ideas opuestas.' ,
    cn:'基于原因的讨论有助于人们更好地理解自己的意见和相反的意见。' ,
    nl:'Reden-gebaseerde discussie helpt mensen om hun eigen ideeën en tegengestelde ideeën beter te begrijpen.' , 
    fr:'La discussion basée sur la raison aide les gens à mieux comprendre leurs propres idées et les idées opposées.'  , 
    pt:'A discussão baseada na razão ajuda as pessoas a entender melhor suas próprias ideias e ideias opostas.'  } ,
  "These survey tools have been designed to make it fast &amp; easy for people to express their reasons, and to understand others' reasons.": {
    es:'Estas herramientas de encuesta se han diseñado para que las personas expresen sus razones de forma rápida y sencilla y comprendan las razones de los demás.' ,
    cn:'这些调查工具旨在让人们能够快速轻松地表达自己的理由，并了解他人的理由。' ,
    nl:'Deze enquêtetools zijn ontworpen om het mensen snel en gemakkelijk te maken hun redenen kenbaar te maken en de redenen van anderen te begrijpen.' ,
    fr:"Ces outils d'enquête ont été conçus pour permettre aux gens d'exprimer rapidement et facilement leurs raisons et de comprendre les raisons des autres." ,
    pt:'Essas ferramentas de pesquisa foram projetadas para tornar mais rápido e fácil para as pessoas expressarem seus motivos e entenderem os motivos dos outros.'  } ,
  'Discover what problems people care about.': { 
    es:'Descubra qué problemas le importan a la gente.' , 
    cn:'了解人们关心的问题。' , 
    nl:'Ontdek welke problemen mensen belangrijk vinden.' , 
    fr:'Découvrez les problèmes qui préoccupent les gens.'  , 
    pt:'Descubra com quais problemas as pessoas se preocupam.'  } ,
  'Example': { es:'Ejemplo' , cn:'例子' , nl:'Voorbeeld' , fr:'Exemple' , pt:'Exemplo' } ,
  'Get solutions to your problem.': { 
    es:'Obtenga soluciones a su problema.' , 
    cn:'获取解决您的问题的方案。' , 
    nl:'Krijg oplossingen voor uw probleem.' , 
    fr:'Obtenez des solutions à votre problème.'  , 
    pt:'Obtenha soluções para o seu problema.'  } ,
  'Get feedback on your solution.': { 
    es:'Obtenga comentarios sobre su solución.' , 
    cn:'获得有关您的解决方案的反馈。' , 
    nl:'Krijg feedback op uw oplossing.' , 
    fr:'Obtenez des commentaires sur votre solution.' , 
    pt:'Obtenha feedback sobre sua solução.' } ,
  'Negotiate a budget with a group.': {
    es:'Negociar un presupuesto con un grupo.' , 
    cn:'与小组协商预算。' , 
    nl:'Maak met een groep afspraken over het budget.' , 
    fr:'Négocier un budget avec un groupe.' , 
    pt:'Negocie um orçamento com um grupo.'  } ,
  "To grow your understanding of your group's needs, it is often useful to run these survey-types in order.": {
    es:'Para aumentar su comprensión de las necesidades de su grupo, a menudo es útil ejecutar estos tipos de encuestas en orden.' , 
    cn:'按顺序运行这些调查类型通常有助于加深您对团队需求的理解。' ,
    nl:'Om uw begrip van de behoeften van uw groep te vergroten, is het vaak handig om deze soorten enquêtes op volgorde uit te voeren.' , 
    fr:"Pour mieux comprendre les besoins de votre groupe, il est souvent utile d'exécuter ces types d'enquêtes dans l'ordre." , 
    pt:'Para aumentar sua compreensão das necessidades do seu grupo, geralmente é útil executar esses tipos de pesquisa em ordem.'  } ,

  // Budget
  'New Participatory Budget': { 
    es:'Nuevo Presupuesto Participativo' , cn:'新的参与式预算' , nl:'Nieuw participatief budget' , fr:'Nouveau budget participatif' , 
    pt:'Novo Orçamento Participativo'  } ,
  'Budget for...': { es:'Presupuesto para...' , cn:'给...的预算' , nl:'Budget voor...' , fr:'Budget pour...' , pt:'Orçamento para...' } ,
  'We need to allocate money for... because...': {
    es:'Necesitamos asignar dinero para... porque...' , 
    cn:'我们需要拨款用给... 因为...' , 
    nl:'We moeten geld uittrekken voor... omdat...' , 
    fr:"Nous devons allouer de l'argent pour... parce que..." , 
    pt:'Precisamos alocar dinheiro para... porque...'  } ,
  'Total amount to allocate': { es:'Importe total a asignar' , cn:'分配总额' , nl:'Totaal toe te wijzen bedrag' , fr:'Montant total à allouer' , 
    pt:'Valor total a ser alocado'  } ,
  'Start budget': { es:'Presupuesto inicial' , cn:'开始计划预算' , nl:'Start begroting' , fr:'Budget de départ' , pt:'Iniciar orçamento' } ,
  'Amount': { es:'Cantidad' , cn:'数量' , nl:'Hoeveelheid' , fr:'Montant' , pt:'Quantia' } ,
  'Budget': { es:'Presupuesto' , cn:'预算' , nl:'Begroting' , fr:'Budget' , pt:'Orçamento' } ,
  'Budget Item': { es:'Elemento de presupuesto' , cn:'预算项目' , nl:'Budgetartikel' , fr:'Poste budgétaire' , pt:'Item de orçamento' } ,
  'Saved slice': { es:'Artículo guardado' , cn:'保存的项目' , nl:'Opgeslagen artikel' , fr:'Article enregistré' , pt:'Item salvo' } ,
  'Saved budget item': { es:'Elemento de presupuesto guardado' , cn:'保存的预算项目' , nl:'Bewaarde budgetpost' , fr:'Poste budgétaire enregistré' , 
    pt:'Item de orçamento salvo'  } ,
  'Edit Budget': { es:'Editar presupuesto' , cn:'编辑预算' , nl:'Begroting bewerken' , fr:'Modifier le budget' , pt:'Editar orçamento' } ,
  'Budget Title': { es:'Título del presupuesto' , cn:'预算标题' , nl:'Begrotingstitel' , fr:'Intitulé budgétaire' , pt:'Título do orçamento' } ,
  'Introduction': { es:'Introducción' , cn:'简介' , nl:'Invoering' , fr:'Introduction' , pt:'Introdução' } ,
  'introduction...': { es:'introducción...' , cn:'简介' , nl:'invoering...' , fr:'introduction...' , pt:'introdução...' } ,
  'Budget total amount': { es:'Importe total del presupuesto' , cn:'预算总额' , nl:'Budget totaal bedrag' , fr:'Montant total du budget' , 
    pt:'Valor total do orçamento' } ,
  'Budget items': { es:'Elementos de presupuesto' , cn:'预算项目' , nl:'Begrotingsposten' , fr:'Postes budgétaires' , pt:'Itens de orçamento' } ,
  'Users can choose from the budget-items that you suggest here, or add their own budget-items.': { 
    es:'Los usuarios pueden elegir entre los elementos de presupuesto que usted sugiere aquí o agregar sus propios elementos de presupuesto.' , 
    cn:'用户可以从您在此处建议的预算项目中进行选择，或添加自己的预算项目。' , 
    nl:'Gebruikers kunnen kiezen uit de budget-items die u hier voorstelt, of hun eigen budget-items toevoegen.' , 
    fr:'Les utilisateurs peuvent choisir parmi les éléments budgétaires que vous suggérez ici ou ajouter leurs propres éléments budgétaires.' , 
    pt:'Os usuários podem escolher entre os itens de orçamento que você sugere aqui ou adicionar seus próprios itens de orçamento.'  } ,
  'New budget item': { es:'Nuevo elemento de presupuesto' , cn:'新的预算项目' , nl:'Nieuwe begrotingspost' , fr:'Nouveau poste budgétaire' , 
    pt:'Novo item de orçamento'  } ,
  'Type your budget item title, or choose a suggested title': { 
    es:'Escriba el título de su elemento de presupuesto o elija un título sugerido' ,
    cn:'输入您的预算项目标题，或选择建议的标题' , 
    nl:'Typ de titel van uw budgetitem of kies een voorgestelde titel' , 
    fr:'Tapez le titre de votre poste budgétaire ou choisissez un titre suggéré' , 
    pt:'Digite o título do item de orçamento ou escolha um título sugerido'
  } ,
  'Type your budget item reason, or choose a suggested reason': { 
    es:'Escriba el motivo de su elemento de presupuesto o elija un motivo sugerido' ,
    cn:'输入您的预算项目原因，或选择建议的原因' , 
    nl:'Typ de reden voor uw budgetitem of kies een voorgestelde reden' , 
    fr:'Tapez la raison de votre poste budgétaire ou choisissez une raison suggérée' , 
    pt:'Digite o motivo do item de orçamento ou escolha um motivo sugerido'
  } ,
  'Title is too short': {
    es:'El título es demasiado corto' , cn:'标题太短' , nl:'Titel is te kort' , fr:'Le titre est trop court' , pt:'O título é muito curto'  } ,
  'Total allocated': { es:'Total asignado' , cn:'总分配' , nl:'Totaal toegewezen' , fr:'Total alloué' , pt:'Total alocado' } ,
  'Smaller reason': { es:'Razón menor' , cn:'较小的原因' , nl:'Kleinere reden' , fr:'Petite raison' , pt:'Motivo menor' } ,
  'Larger reason': { es:'Razón más grande' , cn:'更大的原因' , nl:'Grotere reden' , fr:'Raison plus grande' , pt:'Motivo maior' } ,
  'Title': { es:'Título' , cn:'标题' , nl:'Titel' , fr:'Titre' , pt:'Título' } ,
  'title...': { es:'título...' , cn:'标题' , nl:'titel...' , fr:'titre...' , pt:'título...' } ,
  'View Budget': { es:'Ver presupuesto' , cn:'查看预算' , nl:'Begroting bekijken' , fr:'Afficher le budget' , pt:'Ver orçamento' } ,
  "Your budget is created. You can email this webpage's URL to participants.": {
    es:'Se crea su presupuesto. Puede enviar por correo electrónico la URL de esta página web a los participantes.' , 
    cn:'您的预算已创建。您可以通过电子邮件将此网页的 URL 发送给参与者。' ,
    nl:'Uw budget is gemaakt. U kunt de URL van deze webpagina naar deelnemers e-mailen.' , 
    fr:"Votre budget est créé. Vous pouvez envoyer l'URL de cette page Web aux participants par e-mail." , 
    pt:'Seu orçamento está criado. Você pode enviar por e-mail o URL desta página da Web aos participantes.'  } ,
  'Total budget': { es:'Presupuesto total' , cn:'总预算' , nl:'Totale budget' , fr:'Budget total' , pt:'Orçamento total' } ,
  'Percent used': { es:'Porcentaje utilizado' , cn:'使用百分比' , nl:'Percentage gebruikt' , fr:'Pourcentage utilisé' , pt:'Porcentagem usada' } ,
  'Reason': { es:'Razón' , cn:'原因' , nl:'Reden' , fr:'Raison' , pt:'Razão' } ,
  'Percent of budget': { es:'Porcentaje del presupuesto' , cn:'占总预算的百分比' , nl:'Procent van het budget' , fr:'Pourcentage du budget' , 
    pt:'Porcentagem do orçamento'  } ,
  'Budget Results': { es:'Resultados del presupuesto' , cn:'预算结果' , nl:'Budgetresultaten' , fr:'Résultats budgétaires' , 
    pt:'Resultados do orçamento' } ,
  'Total amount': { es:'Cantidad total' , cn:'总金额' , nl:'Totaalbedrag' , fr:'Montant total' , pt:'Montante total' } ,
  'Budget Amount': { es:'Cantidad de presupuesto' , cn:'此预算所占百分比' , nl:'Budget bedrag' , fr:'Montant budgétaire' , 
    pt:'Montante do orçamento'  } ,
  'Votes': { es:'Votos' , cn:'票数' , nl:'Stemmen' , fr:'Votes' , pt:'Votos' } ,

  // Auto-complete
  'New Auto-complete Survey': { 
    es:'Nueva Encuesta de Autocompletar' , 
    cn:'新的自动完成的问卷调查' , 
    nl:'Nieuwe enquête voor automatisch aanvullen' , 
    fr:'Nouvelle enquête à saisie automatique' , 
    pt:'Nova pesquisa de preenchimento automático' } ,
  'Worry less about whether you are providing the right multiple choice options, by letting particpants add their own options. But still get useful convergence to a few best answers.': { 
    es:'Preocúpese menos de si está brindando las opciones correctas de opción múltiple, al permitir que los participantes agreguen sus propias opciones. Pero aún obtenga una convergencia útil para algunas mejores respuestas.' , 
    cn:'通过让参与者添加自己的选项，您不必担心您是否提供了正确的多项选择。但仍然可以获得一些最佳答案的有用收敛。' ,
    nl:'U hoeft zich minder zorgen te maken of u de juiste meerkeuzeopties aanbiedt, door deelnemers hun eigen opties te laten toevoegen. Maar krijg nog steeds bruikbare convergentie tot een paar beste antwoorden.' , 
    fr:'Ne vous souciez plus de savoir si vous fournissez les bonnes options à choix multiples, en laissant les participants ajouter leurs propres options. Mais obtenez toujours une convergence utile vers quelques meilleures réponses.' , 
    pt:'Preocupe-se menos se você está fornecendo as opções corretas de múltipla escolha, permitindo que os participantes adicionem suas próprias opções. Mas ainda assim obter convergência útil para algumas das melhores respostas.'  } ,
  'Question is too short.': { es:'La pregunta es demasiado corta.' , cn:'问题太短。' , nl:'Vraag is te kort.' , fr:'La question est trop courte.' , 
    pt:'A pergunta é muito curta.'  } ,
  'Saved question': { es:'Pregunta guardada' , cn:'保存的问题' , nl:'Opgeslagen vraag' , fr:'Question enregistrée' , pt:'Pergunta salva' } ,
  'Edit survey': { es:'Editar encuesta' , cn:'编辑问卷调查' , nl:'Enquête bewerken' , fr:"Modifier l'enquête" , pt:'Editar pesquisa' } ,
  'Edit Survey': { es:'Editar Encuesta' , cn:'编辑问卷调查' , nl:'Enquête Bewerken' , fr:"Modifier L'enquête" , pt:'Editar Pesquisa' } ,
  'Survey about...': { es:'Encuesta sobre...' , cn:'关于...的问卷调查' , nl:'Enquête over...' , fr:'Sondage sur...' , pt:'Pesquisa sobre...' } ,
  'More information about this survey...': { 
    es:'Más información sobre esta encuesta...' , 
    cn:'有关此问卷调查的更多信息...' , 
    nl:'Meer informatie over dit onderzoek...' , 
    fr:"Plus d'informations sur cette enquête..." , 
    pt:'Mais informações sobre esta pesquisa...' } ,
  'Survey title': { es:'Título de la encuesta' , cn:'问卷调查标题' , nl:'Enquête titel' , fr:"Titre de l'enquête" , pt:'Título da pesquisa' } ,
  'Survey introduction': { es:'Introducción a la encuesta' , cn:'问卷调查介绍' , nl:'Enquête introductie' , fr:"Présentation de l'enquête" , 
    pt:'Introdução à pesquisa'  } ,
  'Questions': { es:'Preguntas' , cn:'问题' , nl:'Vragen' , fr:'Des questions' , pt:'Questões' } ,
  'Add survey questions here.': { 
    es:'Agregue preguntas de la encuesta aquí.' , 
    cn:'在此处添加问卷调查的问题。' , 
    nl:'Voeg hier enquêtevragen toe.' , 
    fr:"Ajoutez ici des questions d'enquête." , 
    pt:'Adicione perguntas de pesquisa aqui.' } ,
  "You can suggest answers here. Participants will also be able to enter any answer they want, or copy each other's answers.": { 
    es:'Puede sugerir respuestas aquí. Los participantes también podrán ingresar cualquier respuesta que deseen o copiar las respuestas de los demás.' ,
    cn:'您可以在此处给出建议答案。参与者也可以输入他们想要的任何答案，或复制彼此的答案。' ,
    nl:'U kunt hier antwoorden voorstellen. Deelnemers kunnen ook elk gewenst antwoord invoeren of elkaars antwoorden kopiëren.' , 
    fr:'Vous pouvez suggérer des réponses ici. Les participants pourront également saisir la réponse de leur choix ou copier les réponses des autres.' , 
    pt:'Você pode sugerir respostas aqui. Os participantes também poderão inserir qualquer resposta que desejarem ou copiar as respostas uns dos outros.'  } ,
  'New question': { es:'Nueva pregunta' , cn:'新的问题' , nl:'Nieuwe vraag' , fr:'Nouvelle question' , pt:'Nova pergunta' } ,
  'View Survey': { es:'Ver Encuesta' , cn:'查看问卷调查' , nl:'Enquête bekijken' , fr:"Voir l'enquête" , pt:'Ver pesquisa' } ,
  'Question': { es:'Pregunta' , cn:'问题' , nl:'Vraag' , fr:'Question' , pt:'Pergunta' } ,
  'Suggest Answer': { es:'Sugerir respuesta' , cn:'建议答案' , nl:'Stel een antwoord voor' , fr:'Suggérer une réponse' , pt:'Sugerir resposta' } ,
  'Suggested Answer': { es:'Respuesta sugerida' , cn:'建议的答案' , nl:'Gesuggereerd antwoord' , fr:'Réponse suggérée' , pt:'Resposta sugerida' } ,
  'Reason is too short.': { es:'La razón es demasiado corta.' , cn:'所列的理由太短了。' , nl:'Reden is te kort.' , fr:'La raison est trop courte.' , 
    pt:'A razão é muito curta.'  } ,
  'Reason is too short': { es:'La razón es demasiado corta' , cn:'所列的理由太短了' , nl:'Reden is te kort' , fr:'La raison est trop courte' , 
    pt:'A razão é muito curta'  } ,
  'Answer is too short': { 
    es:'La respuesta es demasiado corta' , cn:'答案太短' , nl:'Antwoord is te kort' , fr:'La réponse est trop courte' , 
    pt:'A resposta é muito curta'  } ,
  'Saved answer': { es:'La respuesta fue guardada' , cn:'答案已保存' , nl:'Opgeslagen antwoord' , fr:'Réponse enregistrée' , pt:'Resposta salva' } ,
  'Type your answer, or choose a suggested answer': {
    es:'Escriba su respuesta o elija una respuesta sugerida' ,
    cn:'输入您的答案，或从建议的答案中选择' ,
    nl:'Typ uw antwoord of kies een voorgesteld antwoord' , 
    fr:'Tapez votre réponse ou choisissez une réponse suggérée' , 
    pt:'Digite sua resposta ou escolha uma resposta sugerida'  } ,
  'Type your reason, or choose a suggested answer and reason': {
    es:'Escriba su motivo o elija una respuesta sugerida y un motivo' ,
    cn:'输入您的原因，或从建议的答案和原因中选择' ,
    nl:'Typ uw reden of kies een voorgesteld antwoord en reden' ,
    fr:'Tapez votre raison ou choisissez une réponse et une raison suggérées' , 
    pt:'Digite seu motivo ou escolha uma resposta e um motivo sugeridos'  } ,
  'Answer': { es:'Respuesta' , cn:'回答' , nl:'Antwoord' , fr:'Réponse' , pt:'Resposta' } ,
  'Survey Results': { es:'Resultados de la encuesta' , cn:'问卷调查结果' , nl:'Resultaten van de enquête' , fr:'Résultats du sondage' , 
    pt:'Resultados da pesquisa' } ,
  "Your survey is created. You can email this webpage's URL to participants.": {
    es:'Se crea su encuesta. Puede enviar por correo electrónico la URL de esta página web a los participantes.' ,
    cn:'您的问卷调查已创建。您可以通过电子邮件将此网页的 URL 发送给参与者。' ,
    nl:'Uw enquête is gemaakt. U kunt de URL van deze webpagina naar deelnemers e-mailen.' , 
    fr:"Votre enquête est créée. Vous pouvez envoyer l'URL de cette page Web aux participants par e-mail." , 
    pt:'Sua pesquisa foi criada. Você pode enviar por e-mail o URL desta página da Web aos participantes.'  } ,
  'Survey complete': { es:'Encuesta completa' , cn:'问卷调查以完成' , nl:'Enquête is voltooid' , fr:"L'enquête est terminée" , 
    pt:'A pesquisa está concluída'  } ,
  'Count': { es:'Cantidad' , cn:'数量' , nl:'Graaf' , fr:'Nombre' , pt:'Contagem' } ,
  'More answers': { es:'Más respuestas' , cn:'更多答案' , nl:'Meer antwoorden' , fr:'Plus de réponses' , pt:'Mais respostas' } ,

  // Proposal pro/con
  'New Proposal': { es:'' , cn:'新的提案' , nl:'Nieuw voorstel' , fr:'Nouvelle proposition' , pt:'Nova proposta' } ,
  "Using Converj, a leader can get feedback on their proposal, and participants can point out the pro's and con's of the proposal.": {
    es:'Con Converj, un líder puede obtener comentarios sobre su propuesta y los participantes pueden señalar los pros y los contras de la propuesta.' ,
    cn:'使用 Converj，领导者可以获得对其提案的反馈，同时参与者也可以指出提案的优缺点。' ,
    nl:'Met behulp van Converj kan een leider feedback krijgen op zijn voorstel en deelnemers kunnen wijzen op de voor- en nadelen van het voorstel.' , 
    fr:'En utilisant Converj, un leader peut obtenir des commentaires sur sa proposition, et les participants peuvent souligner les avantages et les inconvénients de la proposition.' ,
    pt:'Usando o Converj, um líder pode obter feedback sobre sua proposta e os participantes podem apontar os prós e contras da proposta.'  } ,
  "Converj handles the most significant problem with group decision-making &amp; participatory democracy: the large effort to organize and evaluate participants' ideas. Converj does this by turning the crowd on itself, to organize and evaluate each-others' ideas.": {
    es:'Converj maneja el problema más importante con la toma de decisiones en grupo y la democracia participativa: ' +
      'el gran esfuerzo para organizar y evaluar las ideas de los participantes. ' +
      'Converj hace esto volviendo a la multitud contra sí misma, para organizar y evaluar las ideas de los demás.' ,
    cn:'Converj 解决了群体决策和参与式民主的最重要问题：组织者需要做大量工作才能得到分析和评估所有参与者的想法。' +
      'Converj 则通过采取群体决策参与者自己来组织和评估彼此的想法来自动达到这个目的。' ,
    nl:'Converj behandelt het belangrijkste probleem met besluitvorming in groepen en participatieve democratie: ' +
      'de grote inspanning om de ideeën van deelnemers te organiseren en te evalueren. ' +
      'Converj doet dit door de menigte op zichzelf te zetten, elkaars ideeën te ordenen en te evalueren.' ,
    fr:"Converj gère le problème le plus important de la prise de décision en groupe et de la démocratie participative: " +
      "l'important effort d'organisation et d'évaluation des idées des participants. " +
      "Converj le fait en retournant la foule sur elle-même, pour organiser et évaluer les idées des autres." , 
    pt:'Converj lida com o problema mais significativo da tomada de decisão em grupo e da democracia participativa: ' +
      'o grande esforço para organizar e avaliar as ideias dos participantes. ' + 
      'Converj faz isso virando a multidão contra si mesma, para organizar e avaliar as ideias uns dos outros.'  
  } ,
  'Details': { es:'Detalles' , cn:'细节' , nl:'Details' , fr:'Détails' , pt:'Detalhes' } ,
  'details...': { es:'detalles...' , cn:'细节' , nl:'details...' , fr:'détails...' , pt:'detalhes...' } ,
  'Propose': { es:'Proponer' , cn:'提出建议' , nl:'Voorstellen' , fr:'Proposer' , pt:'Propor' } ,
  'I propose...': { es:'Propongo...' , cn:'我提议...' , nl:'Ik stel voor...' , fr:'Je propose...' , pt:'Eu proponho...' } ,
  'More details of my proposal...': { 
    es:'Más detalles de mi propuesta...' , 
    cn:'我的建议的更多细节...' , 
    nl:'Meer details van mijn voorstel...' , 
    fr:'Plus de détails sur ma proposition...' , 
    pt:'Mais detalhes da minha proposta...'  } ,
  'Proposal is too short': {
    es:'La propuesta es demasiado corta' , cn:'所列提案太短' , nl:'Voorstel is te kort' , fr:'La proposition est trop courte' , 
    pt:'A proposta é muito curta'  } ,
  'Proposal': { es:'Propuesta' , cn:'提案' , nl:'Voorstel' , fr:'Proposition' , pt:'Proposta' } ,
  'Identical proposal already exists': { 
    es:'Ya existe una propuesta idéntica' , cn:'相同的提案已经存在' , nl:'Er bestaat al een identiek voorstel' , 
    fr:'Une proposition identique existe déjà' , pt:'Já existe uma proposta idêntica'  } ,
  'Saved proposal': { es:'Guardó la propuesta' , cn:'保存提案' , nl:'Het voorstel bewaard' , fr:'La proposition a été enregistrée' , 
    pt:'Salvou a proposta'  } ,
  'I suggest...': { es:'Yo sugiero...' , cn:'我建议...' , nl:'Ik stel voor...' , fr:'Je suggère...' , pt:'Eu sugiro...' } ,
  'More details of my suggestion...': { 
    es:'Más detalles de mi sugerencia...' ,
    cn:'这里有我的建议的更多细节...' , 
    nl:'Meer details van mijn suggestie...' , 
    fr:'Plus de détails sur ma suggestion...' , 
    pt:'Mais detalhes da minha sugestão...'  } ,
  "Your proposal is created. You can email this webpage's link to participants.": {
    es:'Su propuesta está creada. Puede enviar por correo electrónico el enlace de esta página web a los participantes.' ,
    cn:'您的提案已创建。您可以将此网页的链接通过电子邮件发送给参与者。' ,
    nl:'Uw voorstel is gemaakt. U kunt de link van deze webpagina naar deelnemers e-mailen.' , 
    fr:'Votre proposition est créée. Vous pouvez envoyer le lien de cette page Web aux participants par e-mail.' , 
    pt:'Sua proposta está criada. Você pode enviar o link desta página da Web por e-mail aos participantes.' } ,
  'Block all input': { es:'Bloquear todas las entradas' , cn:'禁止所有输入' , nl:'Blokkeer alle invoer' , fr:'Bloquer toutes les entrées' , 
    pt:'Bloquear todas as entradas'  } ,
  'Find or add reason to dis/agree with the proposal': {
    es:'Encuentre o agregue razones para estar de acuerdo o en desacuerdo con la propuesta' ,
    cn:'找到或添加不同意/同意此提案的理由' , 
    nl:'Zoek of voeg redenen toe om het eens of oneens te zijn met het voorstel' , 
    fr:"Trouver ou ajouter une raison d'être d'accord ou non avec la proposition" , 
    pt:'Encontre ou adicione motivos para discordar/concordar com a proposta'  } ,
  'I agree because...': { 
    es:'Estoy de acuerdo porque...' , 
    cn:'我同意，因为...' , 
    nl:'Ik ben het ermee eens omdat...' , 
    fr:"Je suis d'accord parce que..." , 
    pt:'Eu concordo porque...' } ,
  'Reason already exists.': { 
    es:'La razón ya existe.' , cn:'原因已经存在。' , nl:'Reden bestaat al.' , fr:'La raison existe déjà.' , pt:'A razão já existe.' } ,
  'Votes pro': { es:'Votos a favor' , cn:'投赞成票' , nl:'Stemmen pro' , fr:'Votes pour' , pt:'Votos pró' } ,
  'Votes con': { es:'Votos en contra' , cn:'投反对票' , nl:'Stemmen con' , fr:'Votes con' , pt:'Votos contra' } ,
  'More reasons': { es:'Más razones' , cn:'更多原因' , nl:'Meer redenen' , fr:'Plus de raisons' , pt:'Mais razões' } ,
  'Agree': { es:'Aceptar' , cn:'同意' , nl:'Mee eens zijn' , fr:'Accepter' , pt:'Concordar' } ,
  'agree': { es:'aceptar' , cn:'同意' , nl:'mee eens zijn' , fr:'accepter' , pt:'concordar' } ,
  'Disagree': { es:'Discrepar' , cn:'不同意' , nl:'Het oneens zijn' , fr:'Être en désaccord' , pt:'Discordo' } ,
  'disagree': { es:'discrepar' , cn:'不同意' , nl:'het oneens zijn' , fr:'être en désaccord' , pt:'discordo' } ,
  'Save': { es:'Ahorrar' , cn:'存档' , nl:'Redden' , fr:'Sauvegarder' , pt:'Salvar' } ,
  'Cancel': { es:'Cancelar' , cn:'取消' , nl:'Annuleren' , fr:'Annuler' , pt:'Cancelar' } ,
  'Loading reasons...': { es:'Cargando razones...' , cn:'正在加载原因...' , nl:'Redenen laden...' , fr:'Chargement des raisons...' , 
    pt:'Carregando motivos...'  } ,
  'No more reasons yet': { es:'Aún no hay más motivos' , cn:'暂时还没有更多的理由' , nl:'Nog geen redenen meer' , fr:'Pas encore de raisons' , 
    pt:'Ainda não há mais motivos'  } ,
  'Saved reason': { 
    es:'Razón guardada' , 
    cn:'已经保存的理由' , 
    nl:'Opgeslagen reden' , 
    fr:'Raison sauvegardée' , 
    pt:'Razão salva'  } ,
  'Saved reason. Now vote for the best reason.': { 
    es:'Razón guardada. Ahora vota por la mejor razón.' , 
    cn:'已经保存的理由。现在投票选出最佳理由。' , 
    nl:'Opgeslagen reden. Stem nu op de beste reden.' , 
    fr:'Raison sauvegardée. Votez maintenant pour la meilleure raison.' , 
    pt:'Razão salva. Agora vote no melhor motivo.'  } ,
  'Saved vote. (Limit 1 vote per proposal.)': { 
    es:'Voto guardado. (Límite de 1 voto por propuesta.)' , 
    cn:'已保存的投票。 （每个提案限投 1 票。)' , 
    nl:'Opgeslagen stem. (Maximaal 1 stem per voorstel.)' , 
    fr:'Vote enregistré. (Limite de 1 vote par proposition.)' , 
    pt:'Voto salvo. (Limite de 1 voto por proposta.)'  } ,
  'Saved vote': { es:'Voto guardado' , cn:'已保存的投票' , nl:'Opgeslagen stem' , fr:'Vote enregistré' , pt:'Voto salvo'  } ,
  'Last admin change': { 
    es:'Último cambio de administrador' , 
    cn:'上次管理员更改的记录' , 
    nl:'Laatste beheerderswijziging' , 
    fr:"Dernier changement d'administrateur" , 
    pt:'Última alteração de administrador'  } ,

  // Request proposals
  'New Request For Proposals': { es:'Nueva Solicitud de Propuestas' , cn:'新征求建议书' , nl:'Nieuw verzoek om voorstellen' , 
    fr:'Nouvelle demande de propositions' , pt:'Nova Solicitação de Propostas'  } ,
  "Using Converj, a leader can send a request for proposals, to a group of participants. Participants can make proposals, and point out the pro's and con's of proposals.": { 
    es:'Con Converj, un líder puede enviar una solicitud de propuestas a un grupo de participantes. ' + 
      'Los participantes pueden hacer propuestas y señalar los pros y los contras de las propuestas.' ,
    cn:'使用 Converj，领导者可以向一组参与者发送提案请求。参与者可以提出建议，并指出建议的优缺点。' ,
    nl:'Met behulp van Converj kan een leider een verzoek om voorstellen naar een groep deelnemers sturen. ' +
      'Deelnemers kunnen voorstellen doen en wijzen op de voor- en nadelen van voorstellen.' , 
    fr:"En utilisant Converj, un leader peut envoyer une demande de propositions à un groupe de participants. " +
      "Les participants peuvent faire des propositions et souligner les avantages et les inconvénients des propositions." ,
    pt:'Com o Converj, um líder pode enviar uma solicitação de propostas para um grupo de participantes. ' +
      'Os participantes podem fazer propostas e apontar os prós e contras das propostas.'  
  } ,
  "Converj handles the most significant problem with group decision-making &amp; participatory democracy: the high cost of organizing and evaluating participants' ideas.": {
    es:'Converj maneja el problema más importante con la toma de decisiones en grupo y la democracia participativa: ' +
      'el alto costo de organizar y evaluar las ideas de los participantes.' ,
    cn:'Converj 处理了群体决策和参与式民主的最重要问题：组织和评估参与者想法的高成本。' ,
    nl:'Converj behandelt het belangrijkste probleem met besluitvorming in groepen en participatieve democratie: ' +
      'de hoge kosten van het organiseren en evalueren van de ideeën van deelnemers.' , 
    fr:"Converj traite le problème le plus important de la prise de décision de groupe et de la démocratie participative: " +
      "le coût élevé de l'organisation et de l'évaluation des idées des participants." ,
    pt:'Converj lida com o problema mais significativo com tomada de decisão em grupo democracia participativa: ' +
      'o alto custo de organizar e avaliar as ideias dos participantes.' 
  } ,
  'Request Proposals': { es:'Solicitar Propuestas' , cn:'征求提案' , nl:'Vraag offertes aan' , fr:'Demander des propositions' , 
    pt:'Solicitar Propostas'  } ,
  'Request is too short': { es:'La solicitud es demasiado corta' , cn:'征求的内容太短' , nl:'Verzoek is te kort' , fr:'La demande est trop courte' , 
    pt:'A solicitação é muito curta'  } ,
  'How can we...': { es:'Como podemos...' , cn:'我们怎么能够...' , nl:'Hoe kunnen we...' , fr:'Comment pouvons-nous...' , pt:'Como podemos nós...'  } ,
  'More details of our problem...': { 
    es:'Más detalles de nuestro problema...' , 
    cn:'我们的问题的更多细节...' , 
    nl:'Meer details over ons probleem...' , 
    fr:'Plus de détails sur notre problème...' , 
    pt:'Mais detalhes do nosso problema...'  } ,
  "Your request is created. You can email this webpage's link to request participants.": {
    es:'Se crea su solicitud. Puede enviar por correo electrónico el enlace de esta página web para solicitar participantes.' ,
    cn:'您的请求已创建。您可以通过电子邮件发送此网页的链接以请求参与者。' , 
    nl:'Uw aanvraag is gemaakt. U kunt de link van deze webpagina e-mailen om deelnemers aan te vragen.' , 
    fr:'Votre demande est créée. Vous pouvez envoyer le lien de cette page Web par e-mail pour demander des participants.' , 
    pt:'Sua solicitação foi criada. Você pode enviar por e-mail o link desta página da Web para solicitar participantes.'  } ,
  'Block new proposals': { 
    es:'Bloquear nuevas propuestas' , cn:'停止接纳新提案' , nl:'Blokkeer nieuwe voorstellen' , fr:'Bloquer les nouvelles propositions' , 
    pt:'Bloquear novas propostas'  } ,
  'request for proposals title': { 
    es:'título de solicitud de propuestas' , cn:'征求提案标题' , nl:'verzoek om voorstellen titel' , fr:'titre de la demande de propositions' , 
    pt:'pedido de propostas titulo'  } ,
  'request for proposals detail': { 
    es:'detalle de la solicitud de propuestas' , cn:'征求提案详情' , nl:'verzoek om voorstellen detail' , fr:'détail de la demande de propositions' , 
    pt:'detalhes do pedido de propostas'  } ,
  'Find or Add Proposal': { 
    es:'Buscar o Agregar Propuesta' , cn:'查找或添加提案' , nl:'Zoek of voeg een voorstel toe' , fr:'Rechercher ou ajouter une proposition' , 
    pt:'Localizar ou adicionar proposta'  } ,
  'Supporting Reasons': { es:'Razones de apoyo' , cn:'支持理由' , nl:'Ondersteunende redenen' , fr:"Raisons à l'appui" , pt:'Razões de apoio' } ,
  'More proposals': { es:'Más propuestas' , cn:'更多提案' , nl:'Meer voorstellen' , fr:'Plus de propositions' , pt:'Mais propostas' } ,
  'More proposal details': { 
    es:'Más detalles de la propuesta' , cn:'更多提案详情' , nl:'Meer voorsteldetails' , fr:'Plus de détails sur la proposition' , 
    pt:'Mais detalhes da proposta' } ,
  'No more proposals yet': { 
    es:'Aún no hay más propuestas' , cn:'还没有更多的提案' , nl:'Nog geen voorstellen meer' , fr:'Pas encore de propositions' , 
    pt:'Ainda não há mais propostas'  } ,
  'Loading more proposals...': { 
    es:'Cargando más propuestas...' , cn:'加载更多提案...' , nl:'Meer voorstellen laden...' , fr:'Chargement de plus de propositions...' , 
    pt:'Carregando mais propostas...'  } ,
  'Because...': { es:'Porque...' , cn:'因为...' , nl:'Omdat...' , fr:'Parce que...' , pt:'Porque...' } ,
  'More reasons to agree...': { 
    es:'Más razones para estar de acuerdo...' , 
    cn:'更多同意的理由...' , 
    nl:'Meer redenen om akkoord te gaan...' , 
    fr:"Plus de raisons d'être d'accord..." , 
    pt:'Mais motivos para concordar...'  } ,
  'Back to proposals': { es:'Volver a las propuestas' , cn:'返回提案' , nl:'Terug naar voorstellen' , fr:'Retour aux propositions' , 
    pt:'Voltar para propostas'  } ,

  '': { es:'' , cn:'' , nl:'' , fr:'' , pt:'' } ,  // Handle empty translation attempts

};

