"use client";

import { createContext, type ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
import { APP_LANGUAGE_OPTIONS, DEFAULT_APP_LANGUAGE, normalizeAppLanguage } from "@/lib/appLanguage";
import type { AppLanguage } from "@/lib/types";
import { authenticatedFetch } from "@/utils/authenticatedFetch";

const DICTIONARY = {
  en: {
    dashboard: "Dashboard",
    clients: "Clients",
    invoices: "Invoices",
    expenses: "Expenses",
    analytics: "Analytics",
    settings: "Settings",
    help: "Help & onboarding",
    signOut: "Sign out",
    installApp: "Install App",
    search: "Search or jump to...",
    quickActions: "Quick Actions",
    createInvoice: "Create invoice",
    addClient: "Add client",
    addExpense: "Add expense",
    reviewOverdue: "Review overdue invoices",
    openAnalytics: "Open analytics",
    notifications: "Notifications",
    noNotifications: "No new notifications.",
    appLanguage: "App language",
    appLanguageHelp: "Choose the language used across the workspace.",
  },
  de: {
    dashboard: "Uebersicht",
    clients: "Kunden",
    invoices: "Rechnungen",
    expenses: "Ausgaben",
    analytics: "Analysen",
    settings: "Einstellungen",
    help: "Hilfe & Einfuehrung",
    signOut: "Abmelden",
    installApp: "App installieren",
    search: "Suchen oder springen...",
    quickActions: "Schnellaktionen",
    createInvoice: "Rechnung erstellen",
    addClient: "Kunde hinzufuegen",
    addExpense: "Ausgabe erfassen",
    reviewOverdue: "Ueberfaellige Rechnungen pruefen",
    openAnalytics: "Analysen oeffnen",
    notifications: "Benachrichtigungen",
    noNotifications: "Keine neuen Benachrichtigungen.",
    appLanguage: "App-Sprache",
    appLanguageHelp: "Waehle die Sprache fuer den Arbeitsbereich.",
  },
  es: {
    dashboard: "Inicio",
    clients: "Clientes",
    invoices: "Facturas",
    expenses: "Gastos",
    analytics: "Analiticas",
    settings: "Ajustes",
    help: "Ayuda e inicio",
    signOut: "Cerrar sesion",
    installApp: "Instalar app",
    search: "Buscar o ir a...",
    quickActions: "Acciones rapidas",
    createInvoice: "Crear factura",
    addClient: "Agregar cliente",
    addExpense: "Registrar gasto",
    reviewOverdue: "Revisar facturas vencidas",
    openAnalytics: "Abrir analiticas",
    notifications: "Notificaciones",
    noNotifications: "Sin notificaciones nuevas.",
    appLanguage: "Idioma de la app",
    appLanguageHelp: "Elige el idioma del espacio de trabajo.",
  },
  fr: {
    dashboard: "Tableau de bord",
    clients: "Clients",
    invoices: "Factures",
    expenses: "Depenses",
    analytics: "Analyses",
    settings: "Parametres",
    help: "Aide et demarrage",
    signOut: "Se deconnecter",
    installApp: "Installer l'app",
    search: "Rechercher ou ouvrir...",
    quickActions: "Actions rapides",
    createInvoice: "Creer une facture",
    addClient: "Ajouter un client",
    addExpense: "Ajouter une depense",
    reviewOverdue: "Voir les factures en retard",
    openAnalytics: "Ouvrir les analyses",
    notifications: "Notifications",
    noNotifications: "Aucune nouvelle notification.",
    appLanguage: "Langue de l'app",
    appLanguageHelp: "Choisissez la langue de l'espace de travail.",
  },
  it: {
    dashboard: "Dashboard",
    clients: "Clienti",
    invoices: "Fatture",
    expenses: "Spese",
    analytics: "Analisi",
    settings: "Impostazioni",
    help: "Aiuto e guida",
    signOut: "Esci",
    installApp: "Installa app",
    search: "Cerca o vai a...",
    quickActions: "Azioni rapide",
    createInvoice: "Crea fattura",
    addClient: "Aggiungi cliente",
    addExpense: "Registra spesa",
    reviewOverdue: "Rivedi fatture scadute",
    openAnalytics: "Apri analisi",
    notifications: "Notifiche",
    noNotifications: "Nessuna nuova notifica.",
    appLanguage: "Lingua app",
    appLanguageHelp: "Scegli la lingua dello spazio di lavoro.",
  },
} satisfies Record<AppLanguage, Record<string, string>>;

const UI_PHRASES: Record<string, Partial<Record<Exclude<AppLanguage, "en">, string>>> = {
  "Workspace details, payments, appearance, and account controls": {
    es: "Detalles del espacio, pagos, apariencia y controles de cuenta",
    de: "Arbeitsbereich, Zahlungen, Darstellung und Kontosteuerung",
    fr: "Details de l'espace, paiements, apparence et compte",
    it: "Dettagli spazio, pagamenti, aspetto e controlli account",
  },
  "Create invoices and manage their lifecycle.": {
    es: "Crea facturas y gestiona su ciclo de vida.",
    de: "Rechnungen erstellen und ihren Ablauf verwalten.",
    fr: "Creez des factures et gerez leur cycle de vie.",
    it: "Crea fatture e gestisci il loro ciclo di vita.",
  },
  "Track business costs, keep receipts, and understand net profitability.": {
    es: "Registra costes, guarda recibos y entiende la rentabilidad neta.",
    de: "Kosten erfassen, Belege sichern und Nettogewinn verstehen.",
    fr: "Suivez les couts, gardez les recus et comprenez la rentabilite nette.",
    it: "Monitora costi, conserva ricevute e capisci la redditivita netta.",
  },
  "Use this page for performance trends, collections risk, client concentration, and where expenses are accumulating.": {
    es: "Usa esta pagina para tendencias, riesgo de cobro, concentracion de clientes y gastos acumulados.",
    de: "Nutze diese Seite fuer Trends, Inkassorisiko, Kundenkonzentration und Ausgaben.",
    fr: "Utilisez cette page pour tendances, risque de recouvrement, concentration clients et depenses.",
    it: "Usa questa pagina per trend, rischio incassi, concentrazione clienti e spese.",
  },
  "What needs attention now, without the extra reporting noise.": {
    es: "Lo que necesita atencion ahora, sin ruido extra.",
    de: "Was jetzt Aufmerksamkeit braucht, ohne zusaetzlichen Berichtslarm.",
    fr: "Ce qui demande attention maintenant, sans bruit inutile.",
    it: "Cio che richiede attenzione ora, senza rumore inutile.",
  },
  "Collected this month": { es: "Cobrado este mes", de: "Diesen Monat erhalten", fr: "Encaisse ce mois", it: "Incassato questo mese" },
  "Unpaid pipeline": { es: "Pendiente de cobro", de: "Offene Pipeline", fr: "Pipeline impayee", it: "Pipeline non pagata" },
  "Overdue now": { es: "Vencidas ahora", de: "Jetzt ueberfaellig", fr: "En retard maintenant", it: "Scadute ora" },
  "Awaiting payment": { es: "Esperando pago", de: "Wartet auf Zahlung", fr: "En attente de paiement", it: "In attesa di pagamento" },
  "Quick actions": { es: "Acciones rapidas", de: "Schnellaktionen", fr: "Actions rapides", it: "Azioni rapide" },
  "Create, follow up, or jump into the full performance view.": {
    es: "Crea, da seguimiento o abre la vista completa.",
    de: "Erstellen, nachfassen oder die volle Ansicht oeffnen.",
    fr: "Creez, relancez ou ouvrez la vue complete.",
    it: "Crea, segui o apri la vista completa.",
  },
  "Create invoice": { es: "Crear factura", de: "Rechnung erstellen", fr: "Creer une facture", it: "Crea fattura" },
  "Create Invoice": { es: "Crear factura", de: "Rechnung erstellen", fr: "Creer une facture", it: "Crea fattura" },
  "Add client": { es: "Agregar cliente", de: "Kunde hinzufuegen", fr: "Ajouter un client", it: "Aggiungi cliente" },
  "Add Client": { es: "Agregar cliente", de: "Kunde hinzufuegen", fr: "Ajouter un client", it: "Aggiungi cliente" },
  "Record expense": { es: "Registrar gasto", de: "Ausgabe erfassen", fr: "Ajouter une depense", it: "Registra spesa" },
  "Open analytics": { es: "Abrir analiticas", de: "Analysen oeffnen", fr: "Ouvrir les analyses", it: "Apri analisi" },
  "View all": { es: "Ver todo", de: "Alle anzeigen", fr: "Tout voir", it: "Vedi tutto" },
  "Priority": { es: "Prioridad", de: "Prioritaet", fr: "Priorite", it: "Priorita" },
  "Recent Invoices": { es: "Facturas recientes", de: "Neueste Rechnungen", fr: "Factures recentes", it: "Fatture recenti" },
  "Invoice": { es: "Factura", de: "Rechnung", fr: "Facture", it: "Fattura" },
  "Invoice Number": { es: "Numero de factura", de: "Rechnungsnummer", fr: "Numero de facture", it: "Numero fattura" },
  "Client": { es: "Cliente", de: "Kunde", fr: "Client", it: "Cliente" },
  "Clients": { es: "Clientes", de: "Kunden", fr: "Clients", it: "Clienti" },
  "Total": { es: "Total", de: "Total", fr: "Total", it: "Totale" },
  "Status": { es: "Estado", de: "Status", fr: "Statut", it: "Stato" },
  "Date": { es: "Fecha", de: "Datum", fr: "Date", it: "Data" },
  "Actions": { es: "Acciones", de: "Aktionen", fr: "Actions", it: "Azioni" },
  "Send": { es: "Enviar", de: "Senden", fr: "Envoyer", it: "Invia" },
  "Delete": { es: "Eliminar", de: "Loeschen", fr: "Supprimer", it: "Elimina" },
  "Edit": { es: "Editar", de: "Bearbeiten", fr: "Modifier", it: "Modifica" },
  "Save": { es: "Guardar", de: "Speichern", fr: "Enregistrer", it: "Salva" },
  "Cancel": { es: "Cancelar", de: "Abbrechen", fr: "Annuler", it: "Annulla" },
  "Close": { es: "Cerrar", de: "Schliessen", fr: "Fermer", it: "Chiudi" },
  "Open": { es: "Abrir", de: "Oeffnen", fr: "Ouvrir", it: "Apri" },
  "Add New": { es: "Agregar nuevo", de: "Neu hinzufuegen", fr: "Ajouter", it: "Aggiungi" },
  "Manage": { es: "Gestionar", de: "Verwalten", fr: "Gerer", it: "Gestisci" },
  "More": { es: "Mas", de: "Mehr", fr: "Plus", it: "Altro" },
  "Portfolio Services": { es: "Servicios del portafolio", de: "Portfolio-Dienste", fr: "Services du portefeuille", it: "Servizi del portfolio" },
  "Save repeated services so line items can be filled in one click.": {
    es: "Guarda servicios repetidos para completar lineas con un clic.",
    de: "Speichere wiederkehrende Dienste fuer Zeilen mit einem Klick.",
    fr: "Enregistrez les services frequents pour remplir les lignes en un clic.",
    it: "Salva servizi ricorrenti per compilare righe con un clic.",
  },
  "Name": { es: "Nombre", de: "Name", fr: "Nom", it: "Nome" },
  "Description": { es: "Descripcion", de: "Beschreibung", fr: "Description", it: "Descrizione" },
  "Unit price": { es: "Precio unitario", de: "Einzelpreis", fr: "Prix unitaire", it: "Prezzo unitario" },
  "Unit Price": { es: "Precio unitario", de: "Einzelpreis", fr: "Prix unitaire", it: "Prezzo unitario" },
  "Quantity": { es: "Cantidad", de: "Menge", fr: "Quantite", it: "Quantita" },
  "Qty": { es: "Cant.", de: "Menge", fr: "Qte", it: "Qta" },
  "Tax %": { es: "Impuesto %", de: "Steuer %", fr: "Taxe %", it: "Imposta %" },
  "Active": { es: "Activo", de: "Aktiv", fr: "Actif", it: "Attivo" },
  "Saved Service": { es: "Servicio guardado", de: "Gespeicherter Dienst", fr: "Service enregistre", it: "Servizio salvato" },
  "Use saved service": { es: "Usar servicio guardado", de: "Gespeicherten Dienst nutzen", fr: "Utiliser un service", it: "Usa servizio salvato" },
  "Choose service": { es: "Elegir servicio", de: "Dienst waehlen", fr: "Choisir un service", it: "Scegli servizio" },
  "Choose": { es: "Elegir", de: "Waehlen", fr: "Choisir", it: "Scegli" },
  "Line Items": { es: "Lineas de factura", de: "Rechnungspositionen", fr: "Lignes de facture", it: "Righe fattura" },
  "Line Item": { es: "Linea", de: "Position", fr: "Ligne", it: "Riga" },
  "Line Total": { es: "Total linea", de: "Zeilensumme", fr: "Total ligne", it: "Totale riga" },
  "Add Line Item": { es: "Agregar linea", de: "Position hinzufuegen", fr: "Ajouter une ligne", it: "Aggiungi riga" },
  "Remove Line Item": { es: "Eliminar linea", de: "Position entfernen", fr: "Supprimer la ligne", it: "Rimuovi riga" },
  "Message": { es: "Mensaje", de: "Nachricht", fr: "Message", it: "Messaggio" },
  "Payment Note": { es: "Nota de pago", de: "Zahlungshinweis", fr: "Note de paiement", it: "Nota pagamento" },
  "Subject": { es: "Asunto", de: "Betreff", fr: "Sujet", it: "Oggetto" },
  "Issue Date": { es: "Fecha de emision", de: "Rechnungsdatum", fr: "Date d'emission", it: "Data emissione" },
  "Due Date": { es: "Fecha de vencimiento", de: "Faelligkeitsdatum", fr: "Date d'echeance", it: "Scadenza" },
  "Select Client": { es: "Seleccionar cliente", de: "Kunde waehlen", fr: "Selectionner client", it: "Seleziona cliente" },
  "Expenses": { es: "Gastos", de: "Ausgaben", fr: "Depenses", it: "Spese" },
  "Add Expense": { es: "Agregar gasto", de: "Ausgabe hinzufuegen", fr: "Ajouter une depense", it: "Aggiungi spesa" },
  "Expense Date": { es: "Fecha del gasto", de: "Ausgabedatum", fr: "Date de depense", it: "Data spesa" },
  "Vendor": { es: "Proveedor", de: "Anbieter", fr: "Fournisseur", it: "Fornitore" },
  "Category": { es: "Categoria", de: "Kategorie", fr: "Categorie", it: "Categoria" },
  "Category Name": { es: "Nombre de categoria", de: "Kategoriename", fr: "Nom de categorie", it: "Nome categoria" },
  "Amount": { es: "Importe", de: "Betrag", fr: "Montant", it: "Importo" },
  "Currency": { es: "Moneda", de: "Waehrung", fr: "Devise", it: "Valuta" },
  "Notes": { es: "Notas", de: "Notizen", fr: "Notes", it: "Note" },
  "Receipt": { es: "Recibo", de: "Beleg", fr: "Recu", it: "Ricevuta" },
  "Receipt photo or file": { es: "Foto o archivo del recibo", de: "Belegfoto oder Datei", fr: "Photo ou fichier du recu", it: "Foto o file ricevuta" },
  "Take photo": { es: "Tomar foto", de: "Foto aufnehmen", fr: "Prendre une photo", it: "Scatta foto" },
  "Choose file": { es: "Elegir archivo", de: "Datei waehlen", fr: "Choisir un fichier", it: "Scegli file" },
  "View Receipt": { es: "Ver recibo", de: "Beleg ansehen", fr: "Voir le recu", it: "Vedi ricevuta" },
  "Opening receipt...": { es: "Abriendo recibo...", de: "Beleg wird geoeffnet...", fr: "Ouverture du recu...", it: "Apertura ricevuta..." },
  "Recurring expense": { es: "Gasto recurrente", de: "Wiederkehrende Ausgabe", fr: "Depense recurrente", it: "Spesa ricorrente" },
  "Tax deductible": { es: "Deducible fiscalmente", de: "Steuerlich abziehbar", fr: "Deductible fiscalement", it: "Deducibile" },
  "VAT reclaimable": { es: "IVA recuperable", de: "MWST rueckforderbar", fr: "TVA recuperable", it: "IVA recuperabile" },
  "Analytics": { es: "Analiticas", de: "Analysen", fr: "Analyses", it: "Analisi" },
  "Revenue (selected range)": { es: "Ingresos (rango seleccionado)", de: "Umsatz (gewaehlter Zeitraum)", fr: "Revenus (periode choisie)", it: "Ricavi (periodo scelto)" },
  "Costs (selected range)": { es: "Costes (rango seleccionado)", de: "Kosten (gewaehlter Zeitraum)", fr: "Couts (periode choisie)", it: "Costi (periodo scelto)" },
  "Net result (selected range)": { es: "Resultado neto (rango seleccionado)", de: "Nettoergebnis (gewaehlter Zeitraum)", fr: "Resultat net (periode choisie)", it: "Risultato netto (periodo scelto)" },
  "Margin (selected range)": { es: "Margen (rango seleccionado)", de: "Marge (gewaehlter Zeitraum)", fr: "Marge (periode choisie)", it: "Margine (periodo scelto)" },
  "Selected Date Range": { es: "Rango de fechas seleccionado", de: "Gewaehler Zeitraum", fr: "Periode choisie", it: "Intervallo scelto" },
  "Monthly Report": { es: "Reporte mensual", de: "Monatsbericht", fr: "Rapport mensuel", it: "Report mensile" },
  "Report history": { es: "Historial de reportes", de: "Berichtshistorie", fr: "Historique des rapports", it: "Storico report" },
  "Latest saved report": { es: "Ultimo reporte guardado", de: "Letzter gespeicherter Bericht", fr: "Dernier rapport enregistre", it: "Ultimo report salvato" },
  "Start date": { es: "Fecha inicial", de: "Startdatum", fr: "Date de debut", it: "Data inizio" },
  "End date": { es: "Fecha final", de: "Enddatum", fr: "Date de fin", it: "Data fine" },
  "Top Clients": { es: "Clientes principales", de: "Top-Kunden", fr: "Meilleurs clients", it: "Clienti principali" },
  "Expense Breakdown": { es: "Desglose de gastos", de: "Ausgabenaufschluesselung", fr: "Repartition des depenses", it: "Ripartizione spese" },
  "Settings": { es: "Ajustes", de: "Einstellungen", fr: "Parametres", it: "Impostazioni" },
  "Workspace profile": { es: "Perfil del espacio", de: "Arbeitsbereich-Profil", fr: "Profil de l'espace", it: "Profilo spazio" },
  "Business identity": { es: "Identidad del negocio", de: "Geschaeftsidentitaet", fr: "Identite de l'entreprise", it: "Identita aziendale" },
  "Plan status": { es: "Estado del plan", de: "Planstatus", fr: "Statut du plan", it: "Stato piano" },
  "Company Information": { es: "Informacion de la empresa", de: "Firmeninformationen", fr: "Informations entreprise", it: "Informazioni azienda" },
  "Business Name": { es: "Nombre del negocio", de: "Firmenname", fr: "Nom de l'entreprise", it: "Nome azienda" },
  "Person Name": { es: "Nombre de la persona", de: "Name der Person", fr: "Nom de la personne", it: "Nome persona" },
  "Business Email": { es: "Email del negocio", de: "Geschaefts-E-Mail", fr: "Email entreprise", it: "Email aziendale" },
  "Phone": { es: "Telefono", de: "Telefon", fr: "Telephone", it: "Telefono" },
  "Website": { es: "Sitio web", de: "Website", fr: "Site web", it: "Sito web" },
  "Street": { es: "Calle", de: "Strasse", fr: "Rue", it: "Via" },
  "Postal Code": { es: "Codigo postal", de: "Postleitzahl", fr: "Code postal", it: "CAP" },
  "City": { es: "Ciudad", de: "Stadt", fr: "Ville", it: "Citta" },
  "Country": { es: "Pais", de: "Land", fr: "Pays", it: "Paese" },
  "Invoice setup": { es: "Configuracion de facturas", de: "Rechnungseinstellungen", fr: "Configuration factures", it: "Impostazioni fatture" },
  "Invoice Numbering": { es: "Numeracion de facturas", de: "Rechnungsnummerierung", fr: "Numerotation des factures", it: "Numerazione fatture" },
  "Payments & billing": { es: "Pagos y facturacion", de: "Zahlungen & Abrechnung", fr: "Paiements et facturation", it: "Pagamenti e fatturazione" },
  "Payment methods and billing": { es: "Metodos de pago y facturacion", de: "Zahlungsarten und Abrechnung", fr: "Methodes de paiement et facturation", it: "Metodi di pagamento e fatturazione" },
  "Manual payment note": { es: "Nota de pago manual", de: "Manueller Zahlungshinweis", fr: "Note de paiement manuel", it: "Nota pagamento manuale" },
  "Accept TWINT payments": { es: "Aceptar pagos TWINT", de: "TWINT-Zahlungen akzeptieren", fr: "Accepter les paiements TWINT", it: "Accetta pagamenti TWINT" },
  "TWINT phone number": { es: "Telefono TWINT", de: "TWINT-Telefonnummer", fr: "Telephone TWINT", it: "Telefono TWINT" },
  "Stripe Payments": { es: "Pagos Stripe", de: "Stripe-Zahlungen", fr: "Paiements Stripe", it: "Pagamenti Stripe" },
  "App preferences": { es: "Preferencias de la app", de: "App-Einstellungen", fr: "Preferences de l'app", it: "Preferenze app" },
  "Device and appearance": { es: "Dispositivo y apariencia", de: "Geraet und Darstellung", fr: "Appareil et apparence", it: "Dispositivo e aspetto" },
  "Appearance": { es: "Apariencia", de: "Darstellung", fr: "Apparence", it: "Aspetto" },
  "Dark mode": { es: "Modo oscuro", de: "Dunkelmodus", fr: "Mode sombre", it: "Modalita scura" },
  "Light mode": { es: "Modo claro", de: "Hellmodus", fr: "Mode clair", it: "Modalita chiara" },
  "App Install": { es: "Instalar app", de: "App installieren", fr: "Installer l'app", it: "Installa app" },
  "Help": { es: "Ayuda", de: "Hilfe", fr: "Aide", it: "Aiuto" },
  "Danger Zone": { es: "Zona de peligro", de: "Gefahrenzone", fr: "Zone dangereuse", it: "Zona pericolosa" },
  "Change password": { es: "Cambiar contrasena", de: "Passwort aendern", fr: "Changer le mot de passe", it: "Cambia password" },
  "Disconnect Stripe account": { es: "Desconectar cuenta Stripe", de: "Stripe-Konto trennen", fr: "Deconnecter le compte Stripe", it: "Disconnetti Stripe" },
  "Close workspace": { es: "Cerrar espacio", de: "Arbeitsbereich schliessen", fr: "Fermer l'espace", it: "Chiudi spazio" },
  "Search or jump to...": { es: "Buscar o ir a...", de: "Suchen oder springen...", fr: "Rechercher ou ouvrir...", it: "Cerca o vai a..." },
  "Optional": { es: "Opcional", de: "Optional", fr: "Optionnel", it: "Opzionale" },
  "Dashboard": { es: "Inicio", de: "Uebersicht", fr: "Tableau de bord", it: "Dashboard" },
  "Welcome to your invoicing workspace": { es: "Bienvenido a tu espacio de facturacion", de: "Willkommen in deinem Rechnungsbereich", fr: "Bienvenue dans votre espace de facturation", it: "Benvenuto nello spazio fatture" },
  "Complete the setup below to send your first invoice.": { es: "Completa la configuracion para enviar tu primera factura.", de: "Schliesse die Einrichtung ab, um deine erste Rechnung zu senden.", fr: "Terminez la configuration pour envoyer votre premiere facture.", it: "Completa la configurazione per inviare la prima fattura." },
  "1. Add business info": { es: "1. Agrega datos del negocio", de: "1. Geschaeftsdaten hinzufuegen", fr: "1. Ajouter les infos entreprise", it: "1. Aggiungi dati azienda" },
  "2. Create first client": { es: "2. Crea el primer cliente", de: "2. Ersten Kunden erstellen", fr: "2. Creer le premier client", it: "2. Crea il primo cliente" },
  "3. Create first invoice": { es: "3. Crea la primera factura", de: "3. Erste Rechnung erstellen", fr: "3. Creer la premiere facture", it: "3. Crea la prima fattura" },
  "4. Add first expense": { es: "4. Agrega el primer gasto", de: "4. Erste Ausgabe hinzufuegen", fr: "4. Ajouter la premiere depense", it: "4. Aggiungi la prima spesa" },
  "Add business info": { es: "Agregar datos del negocio", de: "Geschaeftsdaten hinzufuegen", fr: "Ajouter les infos entreprise", it: "Aggiungi dati azienda" },
  "Create client": { es: "Crear cliente", de: "Kunden erstellen", fr: "Creer un client", it: "Crea cliente" },
  "Track expenses": { es: "Registrar gastos", de: "Ausgaben erfassen", fr: "Suivre les depenses", it: "Traccia spese" },
  "Help & onboarding": { es: "Ayuda e inicio", de: "Hilfe & Einfuehrung", fr: "Aide et demarrage", it: "Aiuto e guida" },
  "Cash collected this calendar month": { es: "Cobros recibidos este mes calendario", de: "Einnahmen in diesem Kalendermonat", fr: "Encaissements de ce mois civil", it: "Incassi del mese corrente" },
  "Sent invoices not paid or overdue yet": { es: "Facturas enviadas aun no pagadas ni vencidas", de: "Gesendete Rechnungen, noch nicht bezahlt oder ueberfaellig", fr: "Factures envoyees non payees ni en retard", it: "Fatture inviate non pagate ne scadute" },
  "Pipeline": { es: "Pipeline", de: "Pipeline", fr: "Pipeline", it: "Pipeline" },
  "Next action": { es: "Siguiente accion", de: "Naechste Aktion", fr: "Prochaine action", it: "Prossima azione" },
  "Draft, sent, and overdue invoices not yet paid": { es: "Facturas borrador, enviadas y vencidas aun no pagadas", de: "Entwuerfe, gesendete und ueberfaellige Rechnungen noch offen", fr: "Brouillons, factures envoyees et en retard non payees", it: "Bozze, inviate e scadute non ancora pagate" },
  "No overdue invoices right now. Focus on turning sent invoices into paid revenue.": { es: "No hay facturas vencidas ahora. Convierte las enviadas en ingresos cobrados.", de: "Derzeit keine ueberfaelligen Rechnungen. Verwandle gesendete Rechnungen in bezahlten Umsatz.", fr: "Aucune facture en retard. Transformez les factures envoyees en revenus encaisses.", it: "Nessuna fattura scaduta ora. Trasforma le inviate in ricavi incassati." },
  "Review overdue invoices": { es: "Revisar facturas vencidas", de: "Ueberfaellige Rechnungen pruefen", fr: "Voir les factures en retard", it: "Rivedi fatture scadute" },
  "Review sent invoices": { es: "Revisar facturas enviadas", de: "Gesendete Rechnungen pruefen", fr: "Voir les factures envoyees", it: "Rivedi fatture inviate" },
  "No invoice activity yet": { es: "Aun no hay actividad de facturas", de: "Noch keine Rechnungsaktivitaet", fr: "Aucune activite de facture", it: "Nessuna attivita fatture" },
  "Create an invoice or add a client to start building revenue.": { es: "Crea una factura o agrega un cliente para empezar a generar ingresos.", de: "Erstelle eine Rechnung oder fuege einen Kunden hinzu, um Umsatz aufzubauen.", fr: "Creez une facture ou ajoutez un client pour commencer a generer des revenus.", it: "Crea una fattura o aggiungi un cliente per iniziare a generare ricavi." },
  "Loading invoices...": { es: "Cargando facturas...", de: "Rechnungen werden geladen...", fr: "Chargement des factures...", it: "Caricamento fatture..." },
  "Paid": { es: "Pagada", de: "Bezahlt", fr: "Payee", it: "Pagata" },
  "Overdue": { es: "Vencida", de: "Ueberfaellig", fr: "En retard", it: "Scaduta" },
  "Draft": { es: "Borrador", de: "Entwurf", fr: "Brouillon", it: "Bozza" },
  "Sent": { es: "Enviada", de: "Gesendet", fr: "Envoyee", it: "Inviata" },
  "Cancelled": { es: "Cancelada", de: "Storniert", fr: "Annulee", it: "Annullata" },
  "Unpaid": { es: "Pendiente", de: "Unbezahlt", fr: "Impayee", it: "Non pagata" },
  "paid": { es: "pagada", de: "bezahlt", fr: "payee", it: "pagata" },
  "overdue": { es: "vencida", de: "ueberfaellig", fr: "en retard", it: "scaduta" },
  "draft": { es: "borrador", de: "entwurf", fr: "brouillon", it: "bozza" },
  "sent": { es: "enviada", de: "gesendet", fr: "envoyee", it: "inviata" },
  "cancelled": { es: "cancelada", de: "storniert", fr: "annulee", it: "annullata" },
  "Needs Action": { es: "Necesita accion", de: "Handlung noetig", fr: "Action requise", it: "Richiede azione" },
  "Awaiting Payment": { es: "Esperando pago", de: "Wartet auf Zahlung", fr: "En attente de paiement", it: "In attesa di pagamento" },
  "Paid Recently": { es: "Pagadas recientemente", de: "Kuerzlich bezahlt", fr: "Payees recemment", it: "Pagate di recente" },
  "Clear filter": { es: "Limpiar filtro", de: "Filter loeschen", fr: "Effacer le filtre", it: "Cancella filtro" },
  "Clear Filter": { es: "Limpiar filtro", de: "Filter loeschen", fr: "Effacer le filtre", it: "Cancella filtro" },
  "No invoices yet": { es: "Aun no hay facturas", de: "Noch keine Rechnungen", fr: "Aucune facture", it: "Nessuna fattura" },
  "Create your first invoice to start billing clients.": { es: "Crea tu primera factura para empezar a cobrar a clientes.", de: "Erstelle deine erste Rechnung, um Kunden abzurechnen.", fr: "Creez votre premiere facture pour facturer vos clients.", it: "Crea la prima fattura per fatturare i clienti." },
  "No invoices match your search": { es: "No hay facturas que coincidan", de: "Keine passenden Rechnungen", fr: "Aucune facture ne correspond", it: "Nessuna fattura corrisponde" },
  "Try a different term for invoice number, client, status, or currency.": { es: "Prueba otro termino para numero, cliente, estado o moneda.", de: "Versuche einen anderen Begriff fuer Nummer, Kunde, Status oder Waehrung.", fr: "Essayez un autre terme pour numero, client, statut ou devise.", it: "Prova un altro termine per numero, cliente, stato o valuta." },
  "Select all visible invoices": { es: "Seleccionar todas las facturas visibles", de: "Alle sichtbaren Rechnungen auswaehlen", fr: "Selectionner toutes les factures visibles", it: "Seleziona tutte le fatture visibili" },
  "selected": { es: "seleccionadas", de: "ausgewaehlt", fr: "selectionnees", it: "selezionate" },
  "Sending...": { es: "Enviando...", de: "Wird gesendet...", fr: "Envoi...", it: "Invio..." },
  "Updating...": { es: "Actualizando...", de: "Wird aktualisiert...", fr: "Mise a jour...", it: "Aggiornamento..." },
  "Deleting...": { es: "Eliminando...", de: "Wird geloescht...", fr: "Suppression...", it: "Eliminazione..." },
  "Creating...": { es: "Creando...", de: "Wird erstellt...", fr: "Creation...", it: "Creazione..." },
  "Reminder": { es: "Recordatorio", de: "Erinnerung", fr: "Relance", it: "Promemoria" },
  "Mark Paid": { es: "Marcar pagada", de: "Als bezahlt markieren", fr: "Marquer payee", it: "Segna pagata" },
  "Export CSV": { es: "Exportar CSV", de: "CSV exportieren", fr: "Exporter CSV", it: "Esporta CSV" },
  "Delete Invoice": { es: "Eliminar factura", de: "Rechnung loeschen", fr: "Supprimer la facture", it: "Elimina fattura" },
  "This action cannot be undone.": { es: "Esta accion no se puede deshacer.", de: "Diese Aktion kann nicht rueckgaengig gemacht werden.", fr: "Cette action est irreversible.", it: "Questa azione non puo essere annullata." },
  "This month": { es: "Este mes", de: "Dieser Monat", fr: "Ce mois", it: "Questo mese" },
  "Costs booked in the current month": { es: "Costes registrados en el mes actual", de: "Kosten im aktuellen Monat", fr: "Couts enregistres ce mois", it: "Costi registrati nel mese corrente" },
  "Recurring monthly": { es: "Recurrente mensual", de: "Monatlich wiederkehrend", fr: "Mensuel recurrent", it: "Ricorrente mensile" },
  "Recurring spend currently on the books": { es: "Gasto recurrente registrado actualmente", de: "Aktuell erfasste wiederkehrende Ausgaben", fr: "Depenses recurrentes actuellement enregistrees", it: "Spesa ricorrente attualmente registrata" },
  "Booked costs marked as deductible": { es: "Costes registrados marcados como deducibles", de: "Erfasste Kosten als abziehbar markiert", fr: "Couts enregistres marques deductibles", it: "Costi registrati segnati deducibili" },
  "Reclaimable VAT": { es: "IVA recuperable", de: "Rueckforderbare MWST", fr: "TVA recuperable", it: "IVA recuperabile" },
  "VAT currently reclaimable from booked expenses": { es: "IVA recuperable de gastos registrados", de: "Rueckforderbare MWST aus erfassten Ausgaben", fr: "TVA recuperable sur depenses enregistrees", it: "IVA recuperabile dalle spese registrate" },
  "Optional. Take a photo from the device camera or choose an existing image/PDF.": { es: "Opcional. Toma una foto con la camara o elige una imagen/PDF existente.", de: "Optional. Foto mit der Kamera aufnehmen oder vorhandenes Bild/PDF waehlen.", fr: "Optionnel. Prenez une photo ou choisissez une image/PDF existant.", it: "Opzionale. Scatta una foto o scegli immagine/PDF esistente." },
  "All categories": { es: "Todas las categorias", de: "Alle Kategorien", fr: "Toutes les categories", it: "Tutte le categorie" },
  "Search vendor or description": { es: "Buscar proveedor o descripcion", de: "Anbieter oder Beschreibung suchen", fr: "Rechercher fournisseur ou description", it: "Cerca fornitore o descrizione" },
  "No expenses match your filters": { es: "No hay gastos que coincidan", de: "Keine passenden Ausgaben", fr: "Aucune depense ne correspond", it: "Nessuna spesa corrisponde" },
  "No expenses yet": { es: "Aun no hay gastos", de: "Noch keine Ausgaben", fr: "Aucune depense", it: "Nessuna spesa" },
  "Try a different search term or category.": { es: "Prueba otro termino o categoria.", de: "Versuche einen anderen Suchbegriff oder eine Kategorie.", fr: "Essayez un autre terme ou une autre categorie.", it: "Prova un altro termine o categoria." },
  "Add your first recurring software bill, travel cost, or other business expense.": { es: "Agrega tu primer gasto de software, viaje u otro gasto del negocio.", de: "Fuege deine erste Software-, Reise- oder andere Geschaeftsausgabe hinzu.", fr: "Ajoutez votre premiere depense logiciel, voyage ou autre depense pro.", it: "Aggiungi la prima spesa software, viaggio o altra spesa aziendale." },
  "Flags": { es: "Marcadores", de: "Markierungen", fr: "Marqueurs", it: "Indicatori" },
  "Recurring": { es: "Recurrente", de: "Wiederkehrend", fr: "Recurrent", it: "Ricorrente" },
  "Deductible": { es: "Deducible", de: "Abziehbar", fr: "Deductible", it: "Deducibile" },
  "Opening...": { es: "Abriendo...", de: "Wird geoeffnet...", fr: "Ouverture...", it: "Apertura..." },
  "Edit Expense": { es: "Editar gasto", de: "Ausgabe bearbeiten", fr: "Modifier la depense", it: "Modifica spesa" },
  "Update the details so your reporting stays accurate.": { es: "Actualiza los detalles para mantener tus reportes precisos.", de: "Aktualisiere die Details, damit Berichte korrekt bleiben.", fr: "Mettez a jour les details pour garder des rapports precis.", it: "Aggiorna i dettagli per mantenere report accurati." },
  "Attach a new camera photo or choose an existing image/PDF.": { es: "Adjunta una nueva foto o elige una imagen/PDF existente.", de: "Fuege ein neues Kamerafoto hinzu oder waehle ein Bild/PDF.", fr: "Ajoutez une photo camera ou choisissez une image/PDF.", it: "Allega una nuova foto o scegli immagine/PDF." },
  "Take Photo": { es: "Tomar foto", de: "Foto aufnehmen", fr: "Prendre une photo", it: "Scatta foto" },
  "Choose File": { es: "Elegir archivo", de: "Datei waehlen", fr: "Choisir un fichier", it: "Scegli file" },
  "Uploading...": { es: "Subiendo...", de: "Wird hochgeladen...", fr: "Televersement...", it: "Caricamento..." },
  "Save Expense": { es: "Guardar gasto", de: "Ausgabe speichern", fr: "Enregistrer la depense", it: "Salva spesa" },
  "Delete Expense": { es: "Eliminar gasto", de: "Ausgabe loeschen", fr: "Supprimer la depense", it: "Elimina spesa" },
  "Expense added with receipt attached.": { es: "Gasto agregado con recibo adjunto.", de: "Ausgabe mit Beleg hinzugefuegt.", fr: "Depense ajoutee avec recu joint.", it: "Spesa aggiunta con ricevuta allegata." },
  "Expense added successfully.": { es: "Gasto agregado correctamente.", de: "Ausgabe erfolgreich hinzugefuegt.", fr: "Depense ajoutee avec succes.", it: "Spesa aggiunta correttamente." },
  "Expense updated successfully.": { es: "Gasto actualizado correctamente.", de: "Ausgabe erfolgreich aktualisiert.", fr: "Depense mise a jour avec succes.", it: "Spesa aggiornata correttamente." },
  "Expense deleted.": { es: "Gasto eliminado.", de: "Ausgabe geloescht.", fr: "Depense supprimee.", it: "Spesa eliminata." },
  "Manage your customers and billing contacts.": { es: "Gestiona clientes y contactos de facturacion.", de: "Verwalte Kunden und Rechnungskontakte.", fr: "Gerez vos clients et contacts de facturation.", it: "Gestisci clienti e contatti di fatturazione." },
  "Import clients": { es: "Importar clientes", de: "Kunden importieren", fr: "Importer clients", it: "Importa clienti" },
  "Hide import": { es: "Ocultar importacion", de: "Import ausblenden", fr: "Masquer import", it: "Nascondi import" },
  "Company Name": { es: "Nombre de empresa", de: "Firmenname", fr: "Nom de l'entreprise", it: "Nome azienda" },
  "Contact Name": { es: "Nombre de contacto", de: "Kontaktname", fr: "Nom du contact", it: "Nome contatto" },
  "Email": { es: "Email", de: "E-Mail", fr: "Email", it: "Email" },
  "Optional if company name is set": { es: "Opcional si hay nombre de empresa", de: "Optional, wenn Firmenname gesetzt ist", fr: "Optionnel si le nom entreprise est defini", it: "Opzionale se il nome azienda e impostato" },
  "Choose a country from the list so invoices and payment details stay consistent.": { es: "Elige un pais de la lista para mantener facturas y pagos consistentes.", de: "Waehle ein Land aus der Liste, damit Rechnungen und Zahlungen konsistent bleiben.", fr: "Choisissez un pays dans la liste pour garder factures et paiements coherents.", it: "Scegli un paese dalla lista per mantenere fatture e pagamenti coerenti." },
  "Invoice Language": { es: "Idioma de factura", de: "Rechnungssprache", fr: "Langue de facture", it: "Lingua fattura" },
  "This controls the language used on invoice PDFs and client-facing invoice pages.": { es: "Controla el idioma de los PDF y paginas de factura del cliente.", de: "Steuert die Sprache der PDF-Rechnungen und Kundenseiten.", fr: "Controle la langue des PDF et pages facture client.", it: "Controlla la lingua dei PDF e delle pagine fattura cliente." },
  "VAT Number": { es: "Numero de IVA", de: "MWST-Nummer", fr: "Numero TVA", it: "Numero IVA" },
  "Saving...": { es: "Guardando...", de: "Wird gespeichert...", fr: "Enregistrement...", it: "Salvataggio..." },
  "Client import": { es: "Importacion de clientes", de: "Kundenimport", fr: "Import clients", it: "Import clienti" },
  "Use this if you already keep client details in a spreadsheet and want to migrate them into the app.": { es: "Usalo si ya tienes clientes en una hoja de calculo y quieres migrarlos a la app.", de: "Nutze dies, wenn Kundendaten in einer Tabelle liegen und in die App sollen.", fr: "Utilisez ceci si vos clients sont dans un tableur et doivent migrer dans l'app.", it: "Usalo se hai clienti in un foglio e vuoi migrarli nell'app." },
  "Download template": { es: "Descargar plantilla", de: "Vorlage herunterladen", fr: "Telecharger modele", it: "Scarica modello" },
  "CSV file": { es: "Archivo CSV", de: "CSV-Datei", fr: "Fichier CSV", it: "File CSV" },
  "CSV only. If your source file is Excel, export it as CSV first and match the template headers exactly.": { es: "Solo CSV. Si tu archivo es Excel, exportalo primero como CSV y usa exactamente las cabeceras de la plantilla.", de: "Nur CSV. Wenn die Quelle Excel ist, zuerst als CSV exportieren und die Vorlagenkopfzeilen exakt nutzen.", fr: "CSV uniquement. Si votre fichier vient d'Excel, exportez-le en CSV et respectez les en-tetes.", it: "Solo CSV. Se il file e Excel, esportalo prima come CSV e usa le intestazioni esatte." },
  "Importing...": { es: "Importando...", de: "Wird importiert...", fr: "Import...", it: "Importazione..." },
  "Created": { es: "Creados", de: "Erstellt", fr: "Crees", it: "Creati" },
  "Duplicates skipped": { es: "Duplicados omitidos", de: "Duplikate uebersprungen", fr: "Doublons ignores", it: "Duplicati saltati" },
  "Invalid rows": { es: "Filas invalidas", de: "Ungueltige Zeilen", fr: "Lignes invalides", it: "Righe non valide" },
  "Rows to review": { es: "Filas para revisar", de: "Zu pruefende Zeilen", fr: "Lignes a verifier", it: "Righe da rivedere" },
  "Duplicate": { es: "Duplicado", de: "Duplikat", fr: "Doublon", it: "Duplicato" },
  "Invalid": { es: "Invalido", de: "Ungueltig", fr: "Invalide", it: "Non valido" },
  "No clients yet": { es: "Aun no hay clientes", de: "Noch keine Kunden", fr: "Aucun client", it: "Nessun cliente" },
  "Create your first client to start invoicing.": { es: "Crea tu primer cliente para empezar a facturar.", de: "Erstelle deinen ersten Kunden, um Rechnungen zu schreiben.", fr: "Creez votre premier client pour commencer a facturer.", it: "Crea il primo cliente per iniziare a fatturare." },
  "Create Client": { es: "Crear cliente", de: "Kunden erstellen", fr: "Creer un client", it: "Crea cliente" },
  "No clients match your search": { es: "No hay clientes que coincidan", de: "Keine passenden Kunden", fr: "Aucun client ne correspond", it: "Nessun cliente corrisponde" },
  "Try a different search term for name, email, phone, country, or VAT number.": { es: "Prueba otro termino para nombre, email, telefono, pais o IVA.", de: "Versuche einen anderen Suchbegriff fuer Name, E-Mail, Telefon, Land oder MWST.", fr: "Essayez un autre terme pour nom, email, telephone, pays ou TVA.", it: "Prova un altro termine per nome, email, telefono, paese o IVA." },
  "Unable to load clients.": { es: "No se pudieron cargar los clientes.", de: "Kunden konnten nicht geladen werden.", fr: "Impossible de charger les clients.", it: "Impossibile caricare i clienti." },
  "Client created successfully.": { es: "Cliente creado correctamente.", de: "Kunde erfolgreich erstellt.", fr: "Client cree avec succes.", it: "Cliente creato correttamente." },
  "Import completed with no new clients added.": { es: "Importacion completada sin clientes nuevos.", de: "Import abgeschlossen, keine neuen Kunden hinzugefuegt.", fr: "Import termine sans nouveau client.", it: "Import completato senza nuovi clienti." },
  "Booked expenses in the selected dates": { es: "Gastos registrados en las fechas seleccionadas", de: "Gebuchte Ausgaben im gewaehlten Zeitraum", fr: "Depenses enregistrees dans la periode choisie", it: "Spese registrate nel periodo scelto" },
  "Revenue minus expenses in the selected range": { es: "Ingresos menos gastos en el rango seleccionado", de: "Umsatz minus Ausgaben im gewaehlten Zeitraum", fr: "Revenus moins depenses dans la periode choisie", it: "Ricavi meno spese nel periodo scelto" },
  "Net result divided by revenue in the selected range": { es: "Resultado neto dividido por ingresos en el rango", de: "Nettoergebnis geteilt durch Umsatz im Zeitraum", fr: "Resultat net divise par les revenus de la periode", it: "Risultato netto diviso per ricavi del periodo" },
  "Track what has been issued, collected, and left open for the exact dates selected.": { es: "Mira lo emitido, cobrado y abierto en las fechas exactas elegidas.", de: "Verfolge ausgestellte, bezahlte und offene Betraege fuer die gewaehlten Daten.", fr: "Suivez ce qui est emis, encaisse et ouvert aux dates choisies.", it: "Vedi emesso, incassato e aperto nelle date scelte." },
  "Issued in range": { es: "Emitido en el rango", de: "Im Zeitraum ausgestellt", fr: "Emis dans la periode", it: "Emesso nel periodo" },
  "Collected in range": { es: "Cobrado en el rango", de: "Im Zeitraum erhalten", fr: "Encaisse dans la periode", it: "Incassato nel periodo" },
  "Cash received in the selected dates": { es: "Dinero recibido en las fechas seleccionadas", de: "Zahlungen im gewaehlten Zeitraum", fr: "Encaissements aux dates choisies", it: "Incassi nelle date selezionate" },
  "Open now": { es: "Abierto ahora", de: "Jetzt offen", fr: "Ouvert maintenant", it: "Aperto ora" },
  "Unpaid amount across draft, sent, and overdue invoices": { es: "Importe pendiente en borradores, enviadas y vencidas", de: "Offener Betrag aus Entwuerfen, gesendeten und ueberfaelligen Rechnungen", fr: "Montant impaye sur brouillons, envoyees et en retard", it: "Importo non pagato tra bozze, inviate e scadute" },
  "Currently overdue unpaid amount": { es: "Importe vencido pendiente actualmente", de: "Aktuell ueberfaelliger offener Betrag", fr: "Montant impaye actuellement en retard", it: "Importo scaduto non pagato ora" },
  "Saved monthly report history is generated automatically and emailed on the 1st of each month at 08:00 Europe/Zurich.": { es: "El historial mensual se genera automaticamente y se envia por email el dia 1 a las 08:00 Europe/Zurich.", de: "Die Monatsberichte werden automatisch erstellt und am 1. um 08:00 Europe/Zurich per E-Mail gesendet.", fr: "L'historique mensuel est genere automatiquement et envoye le 1er a 08:00 Europe/Zurich.", it: "Lo storico mensile viene generato automaticamente e inviato il giorno 1 alle 08:00 Europe/Zurich." },
  "Not available yet": { es: "Aun no disponible", de: "Noch nicht verfuegbar", fr: "Pas encore disponible", it: "Non ancora disponibile" },
  "Revenue:": { es: "Ingresos:", de: "Umsatz:", fr: "Revenus:", it: "Ricavi:" },
  "Costs:": { es: "Costes:", de: "Kosten:", fr: "Couts:", it: "Costi:" },
  "Net result:": { es: "Resultado neto:", de: "Nettoergebnis:", fr: "Resultat net:", it: "Risultato netto:" },
  "Email status:": { es: "Estado email:", de: "E-Mail-Status:", fr: "Statut email:", it: "Stato email:" },
  "The first saved report appears after the next monthly automation run.": { es: "El primer reporte guardado aparece despues de la siguiente automatizacion mensual.", de: "Der erste gespeicherte Bericht erscheint nach dem naechsten Monatslauf.", fr: "Le premier rapport apparait apres la prochaine automatisation mensuelle.", it: "Il primo report salvato appare dopo la prossima automazione mensile." },
  "No saved reports yet.": { es: "Aun no hay reportes guardados.", de: "Noch keine gespeicherten Berichte.", fr: "Aucun rapport enregistre.", it: "Nessun report salvato." },
  "Revenue, costs, and net result": { es: "Ingresos, costes y resultado neto", de: "Umsatz, Kosten und Nettoergebnis", fr: "Revenus, couts et resultat net", it: "Ricavi, costi e risultato netto" },
  "Revenue": { es: "Ingresos", de: "Umsatz", fr: "Revenus", it: "Ricavi" },
  "Costs": { es: "Costes", de: "Kosten", fr: "Couts", it: "Costi" },
  "Profit": { es: "Beneficio", de: "Gewinn", fr: "Profit", it: "Utile" },
  "Selected revenue": { es: "Ingresos seleccionados", de: "Gewaehler Umsatz", fr: "Revenus selectionnes", it: "Ricavi selezionati" },
  "Selected costs": { es: "Costes seleccionados", de: "Gewaehle Kosten", fr: "Couts selectionnes", it: "Costi selezionati" },
  "Selected profit": { es: "Beneficio seleccionado", de: "Gewaehler Gewinn", fr: "Profit selectionne", it: "Utile selezionato" },
  "Collections and payment behavior": { es: "Cobros y comportamiento de pago", de: "Inkasso und Zahlungsverhalten", fr: "Encaissements et comportement de paiement", it: "Incassi e comportamento pagamenti" },
  "Overdue exposure": { es: "Exposicion vencida", de: "Ueberfaelliges Risiko", fr: "Exposition en retard", it: "Esposizione scaduta" },
  "No open revenue pipeline right now.": { es: "No hay pipeline de ingresos abierto ahora.", de: "Derzeit keine offene Umsatzpipeline.", fr: "Aucune pipeline de revenus ouverte maintenant.", it: "Nessuna pipeline ricavi aperta ora." },
  "Average days to pay": { es: "Dias medios para pagar", de: "Durchschnittliche Zahlungstage", fr: "Jours moyens de paiement", it: "Giorni medi al pagamento" },
  "Not enough paid invoices yet.": { es: "Aun no hay suficientes facturas pagadas.", de: "Noch nicht genug bezahlte Rechnungen.", fr: "Pas assez de factures payees.", it: "Non ci sono ancora abbastanza fatture pagate." },
  "Best month in this range": { es: "Mejor mes en este rango", de: "Bester Monat im Zeitraum", fr: "Meilleur mois de la periode", it: "Miglior mese nel periodo" },
  "Not enough data yet.": { es: "Aun no hay suficientes datos.", de: "Noch nicht genug Daten.", fr: "Pas encore assez de donnees.", it: "Non ci sono ancora abbastanza dati." },
  "Open pipeline": { es: "Pipeline abierta", de: "Offene Pipeline", fr: "Pipeline ouverte", it: "Pipeline aperta" },
  "Paid invoices:": { es: "Facturas pagadas:", de: "Bezahlte Rechnungen:", fr: "Factures payees:", it: "Fatture pagate:" },
  "Unpaid invoices:": { es: "Facturas pendientes:", de: "Unbezahlte Rechnungen:", fr: "Factures impayees:", it: "Fatture non pagate:" },
  "Average paid invoice": { es: "Factura pagada media", de: "Durchschnittliche bezahlte Rechnung", fr: "Facture payee moyenne", it: "Fattura pagata media" },
  "Review expenses": { es: "Revisar gastos", de: "Ausgaben pruefen", fr: "Voir les depenses", it: "Rivedi spese" },
  "See how concentrated your revenue is and which clients matter most.": { es: "Ve que tan concentrados estan tus ingresos y que clientes importan mas.", de: "Sieh, wie konzentriert dein Umsatz ist und welche Kunden am wichtigsten sind.", fr: "Voyez la concentration des revenus et les clients les plus importants.", it: "Vedi quanto sono concentrati i ricavi e quali clienti contano di piu." },
  "No paid client revenue yet.": { es: "Aun no hay ingresos pagados de clientes.", de: "Noch kein bezahlter Kundenumsatz.", fr: "Aucun revenu client paye pour l'instant.", it: "Nessun ricavo cliente pagato." },
  "Identify where money is going so you can cut or control the biggest categories.": { es: "Identifica donde se va el dinero para controlar las categorias mayores.", de: "Erkenne, wohin Geld fliesst, um grosse Kategorien zu steuern.", fr: "Identifiez ou va l'argent pour controler les plus grandes categories.", it: "Identifica dove va il denaro per controllare le categorie maggiori." },
  "No expenses booked yet.": { es: "Aun no hay gastos registrados.", de: "Noch keine Ausgaben gebucht.", fr: "Aucune depense enregistree.", it: "Nessuna spesa registrata." },
  "VAT Amount": { es: "Importe IVA", de: "MWST-Betrag", fr: "Montant TVA", it: "Importo IVA" },
  "Enable VAT reclaim": { es: "Activa IVA recuperable", de: "MWST-Rueckforderung aktivieren", fr: "Activer TVA recuperable", it: "Attiva recupero IVA" },
  "Optional details for bookkeeping": { es: "Detalles opcionales para contabilidad", de: "Optionale Details fuer Buchhaltung", fr: "Details optionnels pour comptabilite", it: "Dettagli opzionali per contabilita" },
  "Include this in recurring cost tracking.": { es: "Incluyelo en el seguimiento de costes recurrentes.", de: "In die wiederkehrende Kostenverfolgung aufnehmen.", fr: "Inclure dans le suivi des couts recurrents.", it: "Includi nel tracciamento costi ricorrenti." },
  "Use this for deductible business costs.": { es: "Usalo para costes deducibles del negocio.", de: "Fuer abziehbare Geschaeftskosten nutzen.", fr: "Utilisez pour les couts professionnels deductibles.", it: "Usalo per costi aziendali deducibili." },
  "Track VAT you expect to reclaim.": { es: "Registra el IVA que esperas recuperar.", de: "Erfasse MWST, die du zurueckfordern willst.", fr: "Suivez la TVA que vous pensez recuperer.", it: "Traccia l'IVA che prevedi di recuperare." },
  "e.g. Parking": { es: "p. ej. Parking", de: "z. B. Parken", fr: "ex. Parking", it: "es. Parcheggio" },
  "This information appears on invoices, public invoice pages, and payment instructions.": { es: "Esta informacion aparece en facturas, paginas publicas e instrucciones de pago.", de: "Diese Informationen erscheinen auf Rechnungen, oeffentlichen Seiten und Zahlungsanweisungen.", fr: "Ces informations apparaissent sur factures, pages publiques et instructions de paiement.", it: "Queste informazioni appaiono su fatture, pagine pubbliche e istruzioni di pagamento." },
  "Billing status is loading.": { es: "Cargando estado de facturacion.", de: "Abrechnungsstatus wird geladen.", fr: "Chargement du statut de facturation.", it: "Caricamento stato fatturazione." },
  "Upgrade": { es: "Mejorar", de: "Upgrade", fr: "Ameliorer", it: "Aggiorna" },
  "Manage billing": { es: "Gestionar facturacion", de: "Abrechnung verwalten", fr: "Gerer facturation", it: "Gestisci fatturazione" },
  "Logo": { es: "Logo", de: "Logo", fr: "Logo", it: "Logo" },
  "Business logo": { es: "Logo del negocio", de: "Geschaeftslogo", fr: "Logo entreprise", it: "Logo azienda" },
  "No logo": { es: "Sin logo", de: "Kein Logo", fr: "Aucun logo", it: "Nessun logo" },
  "Upload logo": { es: "Subir logo", de: "Logo hochladen", fr: "Televerser logo", it: "Carica logo" },
  "Remove logo": { es: "Eliminar logo", de: "Logo entfernen", fr: "Supprimer logo", it: "Rimuovi logo" },
  "Your full name": { es: "Tu nombre completo", de: "Dein voller Name", fr: "Votre nom complet", it: "Il tuo nome completo" },
  "Invoice Sender": { es: "Remitente de factura", de: "Rechnungsabsender", fr: "Expediteur facture", it: "Mittente fattura" },
  "Company name": { es: "Nombre de empresa", de: "Firmenname", fr: "Nom entreprise", it: "Nome azienda" },
  "Owner name": { es: "Nombre del propietario", de: "Inhabername", fr: "Nom proprietaire", it: "Nome titolare" },
  "Swiss VAT Registration": { es: "Registro IVA suizo", de: "Schweizer MWST-Registrierung", fr: "Inscription TVA suisse", it: "Registrazione IVA svizzera" },
  "No, not VAT registered": { es: "No, sin registro de IVA", de: "Nein, nicht MWST-registriert", fr: "Non, pas inscrit TVA", it: "No, non registrato IVA" },
  "Yes, VAT registered": { es: "Si, registrado para IVA", de: "Ja, MWST-registriert", fr: "Oui, inscrit TVA", it: "Si, registrato IVA" },
  "Swiss VAT Number": { es: "Numero IVA suizo", de: "Schweizer MWST-Nummer", fr: "Numero TVA suisse", it: "Numero IVA svizzero" },
  "Only if VAT registered": { es: "Solo si hay registro IVA", de: "Nur bei MWST-Registrierung", fr: "Seulement si inscrit TVA", it: "Solo se registrato IVA" },
  "Use MWST, TVA, or IVA. A UID without that suffix is not a VAT number.": { es: "Usa MWST, TVA o IVA. Un UID sin ese sufijo no es numero de IVA.", de: "Nutze MWST, TVA oder IVA. Eine UID ohne Suffix ist keine MWST-Nummer.", fr: "Utilisez MWST, TVA ou IVA. Un UID sans suffixe n'est pas un numero TVA.", it: "Usa MWST, TVA o IVA. Un UID senza suffisso non e un numero IVA." },
  "Bank Name": { es: "Nombre del banco", de: "Bankname", fr: "Nom de la banque", it: "Nome banca" },
  "Use the 8 or 11 character bank code, for example `RAIFCH22XXX`.": { es: "Usa el codigo bancario de 8 u 11 caracteres, por ejemplo `RAIFCH22XXX`.", de: "Nutze den Bankcode mit 8 oder 11 Zeichen, z. B. `RAIFCH22XXX`.", fr: "Utilisez le code banque de 8 ou 11 caracteres, par ex. `RAIFCH22XXX`.", it: "Usa il codice banca di 8 o 11 caratteri, es. `RAIFCH22XXX`." },
  "Save workspace profile": { es: "Guardar perfil del espacio", de: "Arbeitsbereich-Profil speichern", fr: "Enregistrer le profil", it: "Salva profilo spazio" },
  "Numbering and sender preview": { es: "Numeracion y vista del remitente", de: "Nummerierung und Absender-Vorschau", fr: "Numerotation et apercu expediteur", it: "Numerazione e anteprima mittente" },
  "Check this section before you send the first official invoice from the workspace.": { es: "Revisa esta seccion antes de enviar la primera factura oficial.", de: "Pruefe diesen Bereich vor der ersten offiziellen Rechnung.", fr: "Verifiez cette section avant la premiere facture officielle.", it: "Controlla questa sezione prima della prima fattura ufficiale." },
  "Next Official Invoice Number": { es: "Siguiente numero oficial", de: "Naechste offizielle Rechnungsnummer", fr: "Prochain numero officiel", it: "Prossimo numero ufficiale" },
  "Preview with today's date": { es: "Vista con fecha de hoy", de: "Vorschau mit heutigem Datum", fr: "Apercu avec la date du jour", it: "Anteprima con data odierna" },
  "Official invoice numbers use the first 2 letters of the client company or first name. Draft invoices keep a temporary draft number until they become official.": { es: "Los numeros oficiales usan las 2 primeras letras de la empresa o nombre del cliente. Los borradores conservan un numero temporal.", de: "Offizielle Rechnungsnummern nutzen die ersten 2 Buchstaben von Firma oder Vorname. Entwuerfe behalten eine temporaere Nummer.", fr: "Les numeros officiels utilisent les 2 premieres lettres de l'entreprise ou du prenom. Les brouillons gardent un numero temporaire.", it: "I numeri ufficiali usano le prime 2 lettere dell'azienda o nome cliente. Le bozze mantengono un numero temporaneo." },
  "Save invoice setup": { es: "Guardar configuracion de facturas", de: "Rechnungseinstellungen speichern", fr: "Enregistrer configuration factures", it: "Salva impostazioni fatture" },
  "Header sender": { es: "Remitente del encabezado", de: "Kopfzeilen-Absender", fr: "Expediteur en-tete", it: "Mittente intestazione" },
  "Business name": { es: "Nombre del negocio", de: "Geschaeftsname", fr: "Nom entreprise", it: "Nome azienda" },
  "Payment recipient": { es: "Destinatario del pago", de: "Zahlungsempfaenger", fr: "Beneficiaire du paiement", it: "Destinatario pagamento" },
  "Recipient name": { es: "Nombre del destinatario", de: "Name des Empfaengers", fr: "Nom du beneficiaire", it: "Nome destinatario" },
  "Configure manual payment notes, optional card payments, and the workspace plan.": { es: "Configura notas de pago, pagos con tarjeta opcionales y el plan.", de: "Konfiguriere Zahlungshinweise, optionale Kartenzahlungen und den Plan.", fr: "Configurez notes de paiement, cartes optionnelles et plan.", it: "Configura note pagamento, carte opzionali e piano." },
  "Let invoices prefill a TWINT payment note with your own phone number.": { es: "Permite que las facturas rellenen una nota TWINT con tu telefono.", de: "Rechnungen koennen einen TWINT-Hinweis mit deiner Nummer vorfuellen.", fr: "Les factures peuvent pre-remplir une note TWINT avec votre telephone.", it: "Le fatture possono precompilare una nota TWINT con il tuo telefono." },
  "New invoices can prefill a payment note with your TWINT phone number.": { es: "Las facturas nuevas pueden incluir una nota con tu telefono TWINT.", de: "Neue Rechnungen koennen einen Hinweis mit deiner TWINT-Nummer enthalten.", fr: "Les nouvelles factures peuvent inclure votre numero TWINT.", it: "Le nuove fatture possono includere il tuo numero TWINT." },
  "Invoice note preview": { es: "Vista previa de nota", de: "Hinweis-Vorschau", fr: "Apercu note facture", it: "Anteprima nota fattura" },
  "TWINT is currently disabled for new invoices.": { es: "TWINT esta desactivado para nuevas facturas.", de: "TWINT ist fuer neue Rechnungen deaktiviert.", fr: "TWINT est desactive pour les nouvelles factures.", it: "TWINT e disattivato per nuove fatture." },
  "Save payment settings": { es: "Guardar ajustes de pago", de: "Zahlungseinstellungen speichern", fr: "Enregistrer paiements", it: "Salva impostazioni pagamento" },
  "Card payments are optional. Bank transfer and Swiss QR bills work without Stripe.": { es: "Los pagos con tarjeta son opcionales. Transferencias y QR suizo funcionan sin Stripe.", de: "Kartenzahlungen sind optional. Ueberweisung und Schweizer QR funktionieren ohne Stripe.", fr: "Les paiements carte sont optionnels. Virement et QR suisse marchent sans Stripe.", it: "I pagamenti carta sono opzionali. Bonifico e QR svizzero funzionano senza Stripe." },
  "Platform Stripe account": { es: "Cuenta Stripe de plataforma", de: "Plattform-Stripe-Konto", fr: "Compte Stripe plateforme", it: "Account Stripe piattaforma" },
  "Stripe account connected": { es: "Cuenta Stripe conectada", de: "Stripe-Konto verbunden", fr: "Compte Stripe connecte", it: "Account Stripe collegato" },
  "Optional card payments": { es: "Pagos con tarjeta opcionales", de: "Optionale Kartenzahlungen", fr: "Paiements carte optionnels", it: "Pagamenti carta opzionali" },
  "Connect Stripe only if this business wants to accept card payments online. Bank transfers and Swiss QR bills work without it.": { es: "Conecta Stripe solo si el negocio acepta tarjetas online. Transferencias y QR suizo funcionan sin eso.", de: "Verbinde Stripe nur fuer Online-Kartenzahlungen. Ueberweisungen und QR funktionieren ohne Stripe.", fr: "Connectez Stripe seulement pour les paiements carte en ligne. Virement et QR suisse marchent sans.", it: "Collega Stripe solo per accettare carte online. Bonifici e QR svizzero funzionano senza." },
  "You can skip this for now and keep using invoices with bank transfer details or Swiss QR bills.": { es: "Puedes omitirlo y seguir usando facturas con transferencia o QR suizo.", de: "Du kannst dies ueberspringen und Rechnungen mit Ueberweisung oder QR nutzen.", fr: "Vous pouvez l'ignorer et utiliser virement ou QR suisse.", it: "Puoi saltarlo e usare fatture con bonifico o QR svizzero." },
  "This workspace uses the app-wide platform Stripe account, so disconnecting is not available here.": { es: "Este espacio usa la cuenta Stripe de plataforma, por eso no se puede desconectar aqui.", de: "Dieser Arbeitsbereich nutzt das Plattform-Stripe-Konto; Trennen ist hier nicht verfuegbar.", fr: "Cet espace utilise le compte Stripe plateforme, deconnexion indisponible ici.", it: "Questo spazio usa l'account Stripe piattaforma, disconnessione non disponibile qui." },
  "Continue Stripe setup": { es: "Continuar configuracion Stripe", de: "Stripe-Einrichtung fortsetzen", fr: "Continuer configuration Stripe", it: "Continua configurazione Stripe" },
  "Connect Stripe": { es: "Conectar Stripe", de: "Stripe verbinden", fr: "Connecter Stripe", it: "Collega Stripe" },
  "Opening Stripe...": { es: "Abriendo Stripe...", de: "Stripe wird geoeffnet...", fr: "Ouverture Stripe...", it: "Apertura Stripe..." },
  "Refresh status": { es: "Actualizar estado", de: "Status aktualisieren", fr: "Actualiser statut", it: "Aggiorna stato" },
  "Refreshing...": { es: "Actualizando...", de: "Wird aktualisiert...", fr: "Actualisation...", it: "Aggiornamento..." },
  "Open the guide when you need it": { es: "Abre la guia cuando la necesites", de: "Oeffne die Anleitung bei Bedarf", fr: "Ouvrez le guide au besoin", it: "Apri la guida quando serve" },
  "Step-by-step help guide": { es: "Guia paso a paso", de: "Schritt-fuer-Schritt-Anleitung", fr: "Guide pas a pas", it: "Guida passo passo" },
  "Use the guide for setup steps, invoice numbering, Stripe, expenses, and client import questions.": { es: "Usa la guia para configuracion, numeracion, Stripe, gastos e importacion.", de: "Nutze die Anleitung fuer Einrichtung, Nummerierung, Stripe, Ausgaben und Import.", fr: "Utilisez le guide pour configuration, numerotation, Stripe, depenses et import.", it: "Usa la guida per configurazione, numerazione, Stripe, spese e import." },
  "Open help guide": { es: "Abrir guia de ayuda", de: "Hilfeanleitung oeffnen", fr: "Ouvrir le guide", it: "Apri guida" },
  "Installed on this device": { es: "Instalada en este dispositivo", de: "Auf diesem Geraet installiert", fr: "Installee sur cet appareil", it: "Installata su questo dispositivo" },
  "Ready to install": { es: "Lista para instalar", de: "Bereit zur Installation", fr: "Prete a installer", it: "Pronta per installare" },
  "Install from your browser menu": { es: "Instala desde el menu del navegador", de: "Aus dem Browsermenue installieren", fr: "Installer depuis le menu navigateur", it: "Installa dal menu browser" },
  "Open in a supported browser to install": { es: "Abre en un navegador compatible para instalar", de: "In einem unterstuetzten Browser oeffnen", fr: "Ouvrez dans un navigateur compatible", it: "Apri in un browser supportato" },
  "Show Install Steps": { es: "Ver pasos de instalacion", de: "Installationsschritte anzeigen", fr: "Voir les etapes", it: "Mostra passaggi" },
  "Switch the workspace between light and dark.": { es: "Cambia el espacio entre claro y oscuro.", de: "Zwischen Hell- und Dunkelmodus wechseln.", fr: "Basculer entre clair et sombre.", it: "Passa tra chiaro e scuro." },
  "Access and workspace controls": { es: "Acceso y controles del espacio", de: "Zugriff und Arbeitsbereich-Steuerung", fr: "Acces et controles espace", it: "Accesso e controlli spazio" },
  "Use these actions when you need to change account access, connected payments, or workspace status.": { es: "Usa estas acciones para cambiar acceso, pagos conectados o estado del espacio.", de: "Nutze diese Aktionen fuer Zugriff, verbundene Zahlungen oder Status.", fr: "Utilisez ces actions pour acces, paiements connectes ou statut.", it: "Usa queste azioni per accesso, pagamenti collegati o stato." },
  "Open the password reset flow for this account if you want to replace your current login password.": { es: "Abre el flujo para restablecer la contrasena de esta cuenta.", de: "Oeffne den Passwort-Reset, wenn du dein Login-Passwort ersetzen willst.", fr: "Ouvrez la reinitialisation du mot de passe pour ce compte.", it: "Apri il reset password per sostituire la password attuale." },
  "Disconnect Stripe": { es: "Desconectar Stripe", de: "Stripe trennen", fr: "Deconnecter Stripe", it: "Disconnetti Stripe" },
  "Disconnecting...": { es: "Desconectando...", de: "Wird getrennt...", fr: "Deconnexion...", it: "Disconnessione..." },
  "Close workspace now": { es: "Cerrar espacio ahora", de: "Arbeitsbereich jetzt schliessen", fr: "Fermer l'espace maintenant", it: "Chiudi spazio ora" },
  "Closing workspace...": { es: "Cerrando espacio...", de: "Arbeitsbereich wird geschlossen...", fr: "Fermeture de l'espace...", it: "Chiusura spazio..." },
  "Before you close the workspace": { es: "Antes de cerrar el espacio", de: "Vor dem Schliessen des Arbeitsbereichs", fr: "Avant de fermer l'espace", it: "Prima di chiudere lo spazio" },
  "View imprint": { es: "Ver aviso legal", de: "Impressum ansehen", fr: "Voir mentions legales", it: "Vedi imprint" },
  "Review privacy policy": { es: "Revisar politica de privacidad", de: "Datenschutzrichtlinie pruefen", fr: "Voir politique de confidentialite", it: "Rivedi privacy policy" },
  "Loading expenses...": { es: "Cargando gastos...", de: "Ausgaben werden geladen...", fr: "Chargement des depenses...", it: "Caricamento spese..." },
  "Unable to load expenses.": { es: "No se pudieron cargar los gastos.", de: "Ausgaben konnten nicht geladen werden.", fr: "Impossible de charger les depenses.", it: "Impossibile caricare le spese." },
  "Unable to load analytics.": { es: "No se pudieron cargar las analiticas.", de: "Analysen konnten nicht geladen werden.", fr: "Impossible de charger les analyses.", it: "Impossibile caricare le analisi." },
  "Filter:": { es: "Filtro:", de: "Filter:", fr: "Filtre :", it: "Filtro:" },
  "Showing": { es: "Mostrando", de: "Zeige", fr: "Affichage", it: "Mostro" },
  "expense": { es: "gasto", de: "Ausgabe", fr: "depense", it: "spesa" },
  "expenses": { es: "gastos", de: "Ausgaben", fr: "depenses", it: "spese" },
  "invoice": { es: "factura", de: "Rechnung", fr: "facture", it: "fattura" },
  "invoices": { es: "facturas", de: "Rechnungen", fr: "factures", it: "fatture" },
  "client": { es: "cliente", de: "Kunde", fr: "client", it: "cliente" },
  "clients": { es: "clientes", de: "Kunden", fr: "clients", it: "clienti" },
  "totaling": { es: "por un total de", de: "mit Summe", fr: "totalisant", it: "per un totale di" },
  "currently overdue": { es: "vencido actualmente", de: "aktuell ueberfaellig", fr: "actuellement en retard", it: "attualmente scaduto" },
  "needs follow-up": { es: "necesita seguimiento", de: "braucht Nachfassung", fr: "necessite une relance", it: "richiede follow-up" },
  "draft, sent, or overdue": { es: "borrador, enviada o vencida", de: "Entwurf, gesendet oder ueberfaellig", fr: "brouillon, envoyee ou en retard", it: "bozza, inviata o scaduta" },
  "Draft, sent, and overdue": { es: "Borradores, enviadas y vencidas", de: "Entwuerfe, gesendete und ueberfaellige", fr: "Brouillons, envoyees et en retard", it: "Bozze, inviate e scadute" },
  "not yet paid": { es: "aun no pagadas", de: "noch nicht bezahlt", fr: "pas encore payees", it: "non ancora pagate" },
  "official invoice": { es: "factura oficial", de: "offizielle Rechnung", fr: "facture officielle", it: "fattura ufficiale" },
  "issued in range": { es: "emitida en el rango", de: "im Zeitraum ausgestellt", fr: "emise dans la periode", it: "emessa nel periodo" },
  "Cash received": { es: "Dinero recibido", de: "Zahlungen erhalten", fr: "Encaissements recus", it: "Incassi ricevuti" },
  "Selected": { es: "Seleccionado", de: "Ausgewaehlt", fr: "Selectionne", it: "Selezionato" },
  "Selected invoices sent.": { es: "Facturas seleccionadas enviadas.", de: "Ausgewaehlte Rechnungen gesendet.", fr: "Factures selectionnees envoyees.", it: "Fatture selezionate inviate." },
  "Selected invoices marked as paid.": { es: "Facturas seleccionadas marcadas como pagadas.", de: "Ausgewaehlte Rechnungen als bezahlt markiert.", fr: "Factures selectionnees marquees payees.", it: "Fatture selezionate segnate pagate." },
  "Selected invoices deleted.": { es: "Facturas seleccionadas eliminadas.", de: "Ausgewaehlte Rechnungen geloescht.", fr: "Factures selectionnees supprimees.", it: "Fatture selezionate eliminate." },
  "Send Invoice": { es: "Enviar factura", de: "Rechnung senden", fr: "Envoyer la facture", it: "Invia fattura" },
  "Send Reminder": { es: "Enviar recordatorio", de: "Erinnerung senden", fr: "Envoyer une relance", it: "Invia promemoria" },
  "Mark Unpaid": { es: "Marcar pendiente", de: "Als unbezahlt markieren", fr: "Marquer impayee", it: "Segna non pagata" },
  "Reopen Invoice": { es: "Reabrir factura", de: "Rechnung wieder oeffnen", fr: "Rouvrir la facture", it: "Riapri fattura" },
  "Reopen & Edit": { es: "Reabrir y editar", de: "Wieder oeffnen & bearbeiten", fr: "Rouvrir et modifier", it: "Riapri e modifica" },
  "Preview": { es: "Vista previa", de: "Vorschau", fr: "Apercu", it: "Anteprima" },
  "Download PDF": { es: "Descargar PDF", de: "PDF herunterladen", fr: "Telecharger PDF", it: "Scarica PDF" },
  "Copy Link": { es: "Copiar enlace", de: "Link kopieren", fr: "Copier le lien", it: "Copia link" },
  "Delete Invoices": { es: "Eliminar facturas", de: "Rechnungen loeschen", fr: "Supprimer les factures", it: "Elimina fatture" },
  "Delete invoice": { es: "Eliminar factura", de: "Rechnung loeschen", fr: "Supprimer la facture", it: "Elimina fattura" },
  "Save changes": { es: "Guardar cambios", de: "Aenderungen speichern", fr: "Enregistrer les modifications", it: "Salva modifiche" },
  "Saving changes...": { es: "Guardando cambios...", de: "Aenderungen werden gespeichert...", fr: "Enregistrement des modifications...", it: "Salvataggio modifiche..." },
  "Save New Password": { es: "Guardar nueva contrasena", de: "Neues Passwort speichern", fr: "Enregistrer le nouveau mot de passe", it: "Salva nuova password" },
  "Updating password...": { es: "Actualizando contrasena...", de: "Passwort wird aktualisiert...", fr: "Mise a jour du mot de passe...", it: "Aggiornamento password..." },
  "Current Password": { es: "Contrasena actual", de: "Aktuelles Passwort", fr: "Mot de passe actuel", it: "Password attuale" },
  "New Password": { es: "Nueva contrasena", de: "Neues Passwort", fr: "Nouveau mot de passe", it: "Nuova password" },
  "Repeat New Password": { es: "Repetir nueva contrasena", de: "Neues Passwort wiederholen", fr: "Repeter le nouveau mot de passe", it: "Ripeti nuova password" },
  "Enter your current password": { es: "Ingresa tu contrasena actual", de: "Aktuelles Passwort eingeben", fr: "Entrez votre mot de passe actuel", it: "Inserisci la password attuale" },
  "At least 8 characters": { es: "Minimo 8 caracteres", de: "Mindestens 8 Zeichen", fr: "Au moins 8 caracteres", it: "Almeno 8 caratteri" },
  "Repeat the new password": { es: "Repite la nueva contrasena", de: "Neues Passwort wiederholen", fr: "Repetez le nouveau mot de passe", it: "Ripeti la nuova password" },
  "Forgot password?": { es: "Olvidaste la contrasena?", de: "Passwort vergessen?", fr: "Mot de passe oublie ?", it: "Password dimenticata?" },
  "Back to settings": { es: "Volver a ajustes", de: "Zurueck zu Einstellungen", fr: "Retour aux parametres", it: "Torna alle impostazioni" },
  "Checking your session...": { es: "Comprobando tu sesion...", de: "Sitzung wird geprueft...", fr: "Verification de la session...", it: "Controllo sessione..." },
  "Search": { es: "Buscar", de: "Suchen", fr: "Rechercher", it: "Cerca" },
  "Account": { es: "Cuenta", de: "Konto", fr: "Compte", it: "Account" },
  "Sign out": { es: "Cerrar sesion", de: "Abmelden", fr: "Se deconnecter", it: "Esci" },
  "Notifications": { es: "Notificaciones", de: "Benachrichtigungen", fr: "Notifications", it: "Notifiche" },
  "No new notifications.": { es: "Sin notificaciones nuevas.", de: "Keine neuen Benachrichtigungen.", fr: "Aucune nouvelle notification.", it: "Nessuna nuova notifica." },
  "Search invoices, clients, or pages": { es: "Buscar facturas, clientes o paginas", de: "Rechnungen, Kunden oder Seiten suchen", fr: "Rechercher factures, clients ou pages", it: "Cerca fatture, clienti o pagine" },
  "No matches found.": { es: "Sin resultados.", de: "Keine Treffer gefunden.", fr: "Aucun resultat.", it: "Nessun risultato." },
  "Try a different search term.": { es: "Prueba otro termino de busqueda.", de: "Versuche einen anderen Suchbegriff.", fr: "Essayez un autre terme.", it: "Prova un altro termine." },
  "View": { es: "Ver", de: "Ansehen", fr: "Voir", it: "Vedi" },
  "Log in": { es: "Iniciar sesion", de: "Anmelden", fr: "Se connecter", it: "Accedi" },
  "Welcome back": { es: "Bienvenido de nuevo", de: "Willkommen zurueck", fr: "Bon retour", it: "Bentornato" },
  "Access your workspace and pick up right where your invoicing left off.": { es: "Accede a tu espacio y continua donde dejaste la facturacion.", de: "Greife auf deinen Arbeitsbereich zu und mache dort weiter, wo du aufgehoert hast.", fr: "Accedez a votre espace et reprenez vos factures la ou vous en etiez.", it: "Accedi allo spazio e riprendi dove avevi lasciato." },
  "Need a new account instead?": { es: "Necesitas una cuenta nueva?", de: "Brauchst du stattdessen ein neues Konto?", fr: "Besoin d'un nouveau compte ?", it: "Serve un nuovo account?" },
  "Create account": { es: "Crear cuenta", de: "Konto erstellen", fr: "Creer un compte", it: "Crea account" },
  "Password": { es: "Contrasena", de: "Passwort", fr: "Mot de passe", it: "Password" },
  "Keep me logged in": { es: "Mantener sesion iniciada", de: "Angemeldet bleiben", fr: "Rester connecte", it: "Resta connesso" },
  "Stay signed in on this device after you close the browser.": { es: "Mantente conectado en este dispositivo despues de cerrar el navegador.", de: "Auf diesem Geraet angemeldet bleiben, auch nach dem Schliessen des Browsers.", fr: "Restez connecte sur cet appareil apres la fermeture du navigateur.", it: "Rimani connesso su questo dispositivo dopo aver chiuso il browser." },
  "Logging in...": { es: "Iniciando sesion...", de: "Anmeldung laeuft...", fr: "Connexion...", it: "Accesso..." },
  "Policy links:": { es: "Enlaces legales:", de: "Rechtliche Links:", fr: "Liens de politique :", it: "Link legali:" },
  "Terms of Service": { es: "Terminos del servicio", de: "Nutzungsbedingungen", fr: "Conditions de service", it: "Termini di servizio" },
  "Privacy Policy": { es: "Politica de privacidad", de: "Datenschutzrichtlinie", fr: "Politique de confidentialite", it: "Informativa privacy" },
  "Create your account": { es: "Crea tu cuenta", de: "Erstelle dein Konto", fr: "Creez votre compte", it: "Crea il tuo account" },
  "Start with the free plan and upgrade only when your invoicing needs grow.": { es: "Empieza con el plan gratuito y mejora solo cuando crezcan tus necesidades.", de: "Starte mit dem kostenlosen Plan und upgrade erst, wenn dein Bedarf waechst.", fr: "Commencez avec le plan gratuit et evoluez seulement si besoin.", it: "Inizia con il piano gratuito e aggiorna solo quando serve." },
  "Already have an account?": { es: "Ya tienes una cuenta?", de: "Hast du schon ein Konto?", fr: "Vous avez deja un compte ?", it: "Hai gia un account?" },
  "Repeat Password": { es: "Repetir contrasena", de: "Passwort wiederholen", fr: "Repeter le mot de passe", it: "Ripeti password" },
  "I accept the Terms of Service and Privacy Policy.": { es: "Acepto los Terminos del servicio y la Politica de privacidad.", de: "Ich akzeptiere die Nutzungsbedingungen und die Datenschutzrichtlinie.", fr: "J'accepte les Conditions de service et la Politique de confidentialite.", it: "Accetto i Termini di servizio e l'Informativa privacy." },
  "Creating account...": { es: "Creando cuenta...", de: "Konto wird erstellt...", fr: "Creation du compte...", it: "Creazione account..." },
  "Forgot your password?": { es: "Olvidaste tu contrasena?", de: "Passwort vergessen?", fr: "Mot de passe oublie ?", it: "Password dimenticata?" },
  "Enter your email and we will send you a reset link.": { es: "Ingresa tu email y te enviaremos un enlace.", de: "Gib deine E-Mail ein und wir senden dir einen Link.", fr: "Entrez votre email et nous vous enverrons un lien.", it: "Inserisci l'email e ti invieremo un link." },
  "Back to login": { es: "Volver al inicio de sesion", de: "Zurueck zur Anmeldung", fr: "Retour a la connexion", it: "Torna al login" },
  "Send reset link": { es: "Enviar enlace", de: "Reset-Link senden", fr: "Envoyer le lien", it: "Invia link" },
  "Sending reset link...": { es: "Enviando enlace...", de: "Reset-Link wird gesendet...", fr: "Envoi du lien...", it: "Invio link..." },
  "Reset your password": { es: "Restablece tu contrasena", de: "Passwort zuruecksetzen", fr: "Reinitialiser le mot de passe", it: "Reimposta password" },
  "Choose a new password for your account.": { es: "Elige una nueva contrasena para tu cuenta.", de: "Waehle ein neues Passwort fuer dein Konto.", fr: "Choisissez un nouveau mot de passe.", it: "Scegli una nuova password." },
  "Resetting password...": { es: "Restableciendo contrasena...", de: "Passwort wird zurueckgesetzt...", fr: "Reinitialisation...", it: "Reimpostazione password..." },
  "Confirm your email": { es: "Confirma tu email", de: "E-Mail bestaetigen", fr: "Confirmez votre email", it: "Conferma email" },
  "Open the verification email, then come back to log in.": { es: "Abre el email de verificacion y vuelve para iniciar sesion.", de: "Oeffne die Bestaetigungs-E-Mail und melde dich danach an.", fr: "Ouvrez l'email de verification puis reconnectez-vous.", it: "Apri l'email di verifica e poi accedi." },
  "Resend verification email": { es: "Reenviar email de verificacion", de: "Bestaetigungs-E-Mail erneut senden", fr: "Renvoyer l'email de verification", it: "Invia di nuovo email verifica" },
  "Go to log in": { es: "Ir a iniciar sesion", de: "Zur Anmeldung", fr: "Aller a la connexion", it: "Vai al login" },
  "This workspace has been closed. Access has been removed, and legally required records may still be retained.": { es: "Este espacio se ha cerrado. El acceso fue eliminado y algunos registros legales pueden conservarse.", de: "Dieser Arbeitsbereich wurde geschlossen. Zugriff wurde entfernt, rechtlich notwendige Daten koennen aufbewahrt werden.", fr: "Cet espace est ferme. L'acces est supprime et certains registres legaux peuvent etre conserves.", it: "Questo spazio e stato chiuso. Accesso rimosso e alcuni record legali possono restare conservati." },
};

const EXTRA_UI_PHRASES: Record<string, Partial<Record<Exclude<AppLanguage, "en">, string>>> = {
  "Missing client name": { es: "Falta el nombre del cliente", de: "Kundenname fehlt", fr: "Nom client manquant", it: "Nome cliente mancante" },
  "Add either a company name or a contact name before saving.": { es: "Agrega una empresa o un contacto antes de guardar.", de: "Fuege vor dem Speichern einen Firmen- oder Kontaktnamen hinzu.", fr: "Ajoutez une entreprise ou un contact avant d'enregistrer.", it: "Aggiungi azienda o contatto prima di salvare." },
  "Invalid email": { es: "Email invalido", de: "Ungueltige E-Mail", fr: "Email invalide", it: "Email non valida" },
  "Enter a valid email address for the client.": { es: "Ingresa un email valido para el cliente.", de: "Gib eine gueltige E-Mail-Adresse fuer den Kunden ein.", fr: "Entrez une adresse email valide pour le client.", it: "Inserisci un'email valida per il cliente." },
  "Invalid country": { es: "Pais invalido", de: "Ungueltiges Land", fr: "Pays invalide", it: "Paese non valido" },
  "Please select a valid country from the list.": { es: "Selecciona un pais valido de la lista.", de: "Bitte waehle ein gueltiges Land aus der Liste.", fr: "Selectionnez un pays valide dans la liste.", it: "Seleziona un paese valido dalla lista." },
  "Failed to update client": { es: "No se pudo actualizar el cliente", de: "Kunde konnte nicht aktualisiert werden", fr: "Impossible de mettre a jour le client", it: "Impossibile aggiornare il cliente" },
  "Client updated successfully.": { es: "Cliente actualizado correctamente.", de: "Kunde erfolgreich aktualisiert.", fr: "Client mis a jour avec succes.", it: "Cliente aggiornato correttamente." },
  "Failed to delete client": { es: "No se pudo eliminar el cliente", de: "Kunde konnte nicht geloescht werden", fr: "Impossible de supprimer le client", it: "Impossibile eliminare il cliente" },
  "Loading client details...": { es: "Cargando detalles del cliente...", de: "Kundendetails werden geladen...", fr: "Chargement des details client...", it: "Caricamento dettagli cliente..." },
  "Client profile and related invoices": { es: "Perfil del cliente y facturas relacionadas", de: "Kundenprofil und zugehoerige Rechnungen", fr: "Profil client et factures associees", it: "Profilo cliente e fatture correlate" },
  "Client Details": { es: "Detalles del cliente", de: "Kundendetails", fr: "Details client", it: "Dettagli cliente" },
  "Address": { es: "Direccion", de: "Adresse", fr: "Adresse", it: "Indirizzo" },
  "Billing Snapshot": { es: "Resumen de facturacion", de: "Abrechnungsuebersicht", fr: "Apercu facturation", it: "Riepilogo fatturazione" },
  "Open Invoices": { es: "Facturas abiertas", de: "Offene Rechnungen", fr: "Factures ouvertes", it: "Fatture aperte" },
  "Outstanding": { es: "Pendiente", de: "Offen", fr: "En attente", it: "In sospeso" },
  "Edit Client": { es: "Editar cliente", de: "Kunde bearbeiten", fr: "Modifier le client", it: "Modifica cliente" },
  "No invoices for this client yet": { es: "Aun no hay facturas para este cliente", de: "Noch keine Rechnungen fuer diesen Kunden", fr: "Aucune facture pour ce client", it: "Nessuna fattura per questo cliente" },
  "Create one directly with this client preselected.": { es: "Crea una directamente con este cliente preseleccionado.", de: "Erstelle direkt eine mit diesem Kunden vorausgewaehlt.", fr: "Creez-en une avec ce client deja selectionne.", it: "Creane una con questo cliente gia selezionato." },
  "Delete Client": { es: "Eliminar cliente", de: "Kunde loeschen", fr: "Supprimer le client", it: "Elimina cliente" },
  "Choose a CSV file": { es: "Elige un archivo CSV", de: "CSV-Datei waehlen", fr: "Choisir un fichier CSV", it: "Scegli file CSV" },
  "Select the client import template or your completed CSV before importing.": { es: "Selecciona la plantilla o tu CSV completado antes de importar.", de: "Waehle vor dem Import die Vorlage oder deine fertige CSV-Datei.", fr: "Selectionnez le modele ou votre CSV avant l'import.", it: "Seleziona il modello o il CSV completato prima di importare." },
  "Receipt upload failed": { es: "Fallo al subir recibo", de: "Beleg-Upload fehlgeschlagen", fr: "Echec du televersement du recu", it: "Caricamento ricevuta fallito" },
  "Receipt uploaded": { es: "Recibo subido", de: "Beleg hochgeladen", fr: "Recu televerse", it: "Ricevuta caricata" },
  "The receipt is now attached to this expense.": { es: "El recibo ya esta adjunto a este gasto.", de: "Der Beleg ist jetzt an diese Ausgabe angehaengt.", fr: "Le recu est maintenant joint a cette depense.", it: "La ricevuta e ora allegata a questa spesa." },
  "Unable to upload receipt": { es: "No se pudo subir el recibo", de: "Beleg konnte nicht hochgeladen werden", fr: "Impossible de televerser le recu", it: "Impossibile caricare la ricevuta" },
  "Unable to add expense": { es: "No se pudo agregar el gasto", de: "Ausgabe konnte nicht hinzugefuegt werden", fr: "Impossible d'ajouter la depense", it: "Impossibile aggiungere la spesa" },
  "Failed to create expense": { es: "No se pudo crear el gasto", de: "Ausgabe konnte nicht erstellt werden", fr: "Impossible de creer la depense", it: "Impossibile creare la spesa" },
  "Unable to save expense": { es: "No se pudo guardar el gasto", de: "Ausgabe konnte nicht gespeichert werden", fr: "Impossible d'enregistrer la depense", it: "Impossibile salvare la spesa" },
  "Failed to update expense": { es: "No se pudo actualizar el gasto", de: "Ausgabe konnte nicht aktualisiert werden", fr: "Impossible de mettre a jour la depense", it: "Impossibile aggiornare la spesa" },
  "Unable to delete expense": { es: "No se pudo eliminar el gasto", de: "Ausgabe konnte nicht geloescht werden", fr: "Impossible de supprimer la depense", it: "Impossibile eliminare la spesa" },
  "Failed to delete expense": { es: "No se pudo eliminar el gasto", de: "Ausgabe konnte nicht geloescht werden", fr: "Impossible de supprimer la depense", it: "Impossibile eliminare la spesa" },
  "Unable to open receipt": { es: "No se pudo abrir el recibo", de: "Beleg konnte nicht geoeffnet werden", fr: "Impossible d'ouvrir le recu", it: "Impossibile aprire la ricevuta" },
  "Receipt access is unavailable.": { es: "El acceso al recibo no esta disponible.", de: "Belegzugriff ist nicht verfuegbar.", fr: "L'acces au recu est indisponible.", it: "Accesso alla ricevuta non disponibile." },
  "Failed to download PDF": { es: "No se pudo descargar el PDF", de: "PDF konnte nicht heruntergeladen werden", fr: "Impossible de telecharger le PDF", it: "Impossibile scaricare il PDF" },
  "Missing dates": { es: "Faltan fechas", de: "Daten fehlen", fr: "Dates manquantes", it: "Date mancanti" },
  "Issue date and due date are required.": { es: "La fecha de emision y vencimiento son obligatorias.", de: "Rechnungsdatum und Faelligkeitsdatum sind erforderlich.", fr: "La date d'emission et l'echeance sont obligatoires.", it: "Data emissione e scadenza sono obbligatorie." },
  "Invalid due date": { es: "Fecha de vencimiento invalida", de: "Ungueltiges Faelligkeitsdatum", fr: "Date d'echeance invalide", it: "Scadenza non valida" },
  "Due date must be on or after issue date.": { es: "El vencimiento debe ser igual o posterior a la emision.", de: "Das Faelligkeitsdatum muss am oder nach dem Rechnungsdatum liegen.", fr: "L'echeance doit etre egale ou posterieure a l'emission.", it: "La scadenza deve essere uguale o successiva all'emissione." },
  "Missing line items": { es: "Faltan lineas", de: "Positionen fehlen", fr: "Lignes manquantes", it: "Righe mancanti" },
  "Invoice must contain at least one line item.": { es: "La factura debe contener al menos una linea.", de: "Die Rechnung muss mindestens eine Position enthalten.", fr: "La facture doit contenir au moins une ligne.", it: "La fattura deve contenere almeno una riga." },
  "Please fix invalid line items before saving.": { es: "Corrige las lineas invalidas antes de guardar.", de: "Bitte korrigiere ungueltige Positionen vor dem Speichern.", fr: "Corrigez les lignes invalides avant d'enregistrer.", it: "Correggi le righe non valide prima di salvare." },
  "Failed to update invoice": { es: "No se pudo actualizar la factura", de: "Rechnung konnte nicht aktualisiert werden", fr: "Impossible de mettre a jour la facture", it: "Impossibile aggiornare la fattura" },
  "Invoice updated successfully.": { es: "Factura actualizada correctamente.", de: "Rechnung erfolgreich aktualisiert.", fr: "Facture mise a jour avec succes.", it: "Fattura aggiornata correttamente." },
  "Loading invoice details...": { es: "Cargando detalles de factura...", de: "Rechnungsdetails werden geladen...", fr: "Chargement details facture...", it: "Caricamento dettagli fattura..." },
  "Invoice Progress": { es: "Progreso de factura", de: "Rechnungsfortschritt", fr: "Progression facture", it: "Avanzamento fattura" },
  "Payment History": { es: "Historial de pagos", de: "Zahlungshistorie", fr: "Historique paiements", it: "Storico pagamenti" },
  "No payments recorded yet.": { es: "Aun no hay pagos registrados.", de: "Noch keine Zahlungen erfasst.", fr: "Aucun paiement enregistre.", it: "Nessun pagamento registrato." },
  "Activity History": { es: "Historial de actividad", de: "Aktivitaetshistorie", fr: "Historique activite", it: "Storico attivita" },
  "No activity recorded yet.": { es: "Aun no hay actividad registrada.", de: "Noch keine Aktivitaet erfasst.", fr: "Aucune activite enregistree.", it: "Nessuna attivita registrata." },
  "Invoice Summary": { es: "Resumen de factura", de: "Rechnungsuebersicht", fr: "Resume facture", it: "Riepilogo fattura" },
  "Amount Due": { es: "Importe pendiente", de: "Faelliger Betrag", fr: "Montant du", it: "Importo dovuto" },
  "Online view": { es: "Vista online", de: "Online-Ansicht", fr: "Vue en ligne", it: "Vista online" },
  "Edit Issue Date": { es: "Editar fecha de emision", de: "Rechnungsdatum bearbeiten", fr: "Modifier date d'emission", it: "Modifica data emissione" },
  "Edit Due Date": { es: "Editar vencimiento", de: "Faelligkeitsdatum bearbeiten", fr: "Modifier echeance", it: "Modifica scadenza" },
  "Add the greeting or message shown on the invoice": { es: "Agrega el saludo o mensaje de la factura", de: "Gruss oder Nachricht fuer die Rechnung eingeben", fr: "Ajoutez le message affiche sur la facture", it: "Aggiungi il messaggio mostrato in fattura" },
  "Optional short payment note, e.g. payment via TWINT possible at +41...": { es: "Nota breve opcional, ej. pago via TWINT posible al +41...", de: "Optionaler kurzer Zahlungshinweis, z. B. Zahlung via TWINT moeglich unter +41...", fr: "Note de paiement courte optionnelle, ex. paiement TWINT possible au +41...", it: "Nota pagamento breve opzionale, es. pagamento TWINT possibile al +41..." },
  "Reorder": { es: "Reordenar", de: "Neu anordnen", fr: "Reordonner", it: "Riordina" },
  "Cancel Invoice": { es: "Cancelar factura", de: "Rechnung stornieren", fr: "Annuler la facture", it: "Annulla fattura" },
  "Reopen Invoice for Editing": { es: "Reabrir factura para editar", de: "Rechnung zur Bearbeitung wieder oeffnen", fr: "Rouvrir la facture pour modification", it: "Riapri fattura per modificare" },
  "Invoice preview unavailable.": { es: "Vista previa no disponible.", de: "Rechnungsvorschau nicht verfuegbar.", fr: "Apercu facture indisponible.", it: "Anteprima fattura non disponibile." },
  "Invoice Preview": { es: "Vista previa de factura", de: "Rechnungsvorschau", fr: "Apercu facture", it: "Anteprima fattura" },
  "Rendered from the actual invoice PDF.": { es: "Renderizado desde el PDF real de la factura.", de: "Aus dem echten Rechnungs-PDF gerendert.", fr: "Rendu depuis le PDF facture reel.", it: "Renderizzato dal PDF fattura reale." },
  "Loading invoice preview...": { es: "Cargando vista previa...", de: "Rechnungsvorschau wird geladen...", fr: "Chargement apercu facture...", it: "Caricamento anteprima..." },
  "Invoice PDF preview": { es: "Vista previa PDF de factura", de: "Rechnungs-PDF-Vorschau", fr: "Apercu PDF facture", it: "Anteprima PDF fattura" },
  "Missing portfolio details": { es: "Faltan detalles del servicio", de: "Portfolio-Details fehlen", fr: "Details service manquants", it: "Dettagli servizio mancanti" },
  "Add a name and description for this service.": { es: "Agrega nombre y descripcion para este servicio.", de: "Fuege Name und Beschreibung fuer diesen Dienst hinzu.", fr: "Ajoutez un nom et une description pour ce service.", it: "Aggiungi nome e descrizione per questo servizio." },
  "Unable to save service": { es: "No se pudo guardar el servicio", de: "Dienst konnte nicht gespeichert werden", fr: "Impossible d'enregistrer le service", it: "Impossibile salvare il servizio" },
  "Portfolio service saved.": { es: "Servicio guardado.", de: "Portfolio-Dienst gespeichert.", fr: "Service enregistre.", it: "Servizio salvato." },
  "The service could not be saved.": { es: "No se pudo guardar el servicio.", de: "Der Dienst konnte nicht gespeichert werden.", fr: "Le service n'a pas pu etre enregistre.", it: "Impossibile salvare il servizio." },
  "Unable to delete service": { es: "No se pudo eliminar el servicio", de: "Dienst konnte nicht geloescht werden", fr: "Impossible de supprimer le service", it: "Impossibile eliminare il servizio" },
  "Portfolio service deleted.": { es: "Servicio eliminado.", de: "Portfolio-Dienst geloescht.", fr: "Service supprime.", it: "Servizio eliminato." },
  "The service could not be deleted.": { es: "No se pudo eliminar el servicio.", de: "Der Dienst konnte nicht geloescht werden.", fr: "Le service n'a pas pu etre supprime.", it: "Impossibile eliminare il servizio." },
  "Missing required fields": { es: "Faltan campos obligatorios", de: "Pflichtfelder fehlen", fr: "Champs obligatoires manquants", it: "Campi obbligatori mancanti" },
  "Please complete all required fields.": { es: "Completa todos los campos obligatorios.", de: "Bitte fuelle alle Pflichtfelder aus.", fr: "Completez tous les champs obligatoires.", it: "Completa tutti i campi obbligatori." },
  "Client creation failed": { es: "No se pudo crear el cliente", de: "Kunde konnte nicht erstellt werden", fr: "Impossible de creer le client", it: "Impossibile creare il cliente" },
  "Client import failed": { es: "No se pudo importar clientes", de: "Kundenimport fehlgeschlagen", fr: "Echec de l'import clients", it: "Import clienti fallito" },
  "Reset link sent": { es: "Enlace enviado", de: "Reset-Link gesendet", fr: "Lien envoye", it: "Link inviato" },
  "Check your email for the password reset link.": { es: "Revisa tu email para el enlace de restablecimiento.", de: "Pruefe deine E-Mail fuer den Reset-Link.", fr: "Verifiez votre email pour le lien de reinitialisation.", it: "Controlla l'email per il link di reset." },
  "Unable to send reset link": { es: "No se pudo enviar el enlace", de: "Reset-Link konnte nicht gesendet werden", fr: "Impossible d'envoyer le lien", it: "Impossibile inviare il link" },
  "Forgot Password": { es: "Olvide mi contrasena", de: "Passwort vergessen", fr: "Mot de passe oublie", it: "Password dimenticata" },
  "Enter your account email": { es: "Ingresa el email de tu cuenta", de: "E-Mail deines Kontos eingeben", fr: "Entrez l'email du compte", it: "Inserisci l'email dell'account" },
  "Unable to open checkout": { es: "No se pudo abrir el pago", de: "Checkout konnte nicht geoeffnet werden", fr: "Impossible d'ouvrir le paiement", it: "Impossibile aprire il checkout" },
  "Unable to open billing portal": { es: "No se pudo abrir el portal de facturacion", de: "Abrechnungsportal konnte nicht geoeffnet werden", fr: "Impossible d'ouvrir le portail de facturation", it: "Impossibile aprire il portale fatturazione" },
  "Failed to send invoice": { es: "No se pudo enviar la factura", de: "Rechnung konnte nicht gesendet werden", fr: "Impossible d'envoyer la facture", it: "Impossibile inviare la fattura" },
  "Failed to duplicate invoice": { es: "No se pudo duplicar la factura", de: "Rechnung konnte nicht dupliziert werden", fr: "Impossible de dupliquer la facture", it: "Impossibile duplicare la fattura" },
  "Failed to send reminder": { es: "No se pudo enviar el recordatorio", de: "Erinnerung konnte nicht gesendet werden", fr: "Impossible d'envoyer la relance", it: "Impossibile inviare il promemoria" },
  "Failed to update invoice status": { es: "No se pudo actualizar el estado", de: "Rechnungsstatus konnte nicht aktualisiert werden", fr: "Impossible de mettre a jour le statut", it: "Impossibile aggiornare lo stato" },
  "Invalid line items": { es: "Lineas invalidas", de: "Ungueltige Positionen", fr: "Lignes invalides", it: "Righe non valide" },
  "Please complete valid line item values.": { es: "Completa valores validos para las lineas.", de: "Bitte gueltige Positionswerte ausfuellen.", fr: "Completez des valeurs de ligne valides.", it: "Completa valori riga validi." },
  "Failed to delete invoice": { es: "No se pudo eliminar la factura", de: "Rechnung konnte nicht geloescht werden", fr: "Impossible de supprimer la facture", it: "Impossibile eliminare la fattura" },
  "Invoice creation failed": { es: "No se pudo crear la factura", de: "Rechnung konnte nicht erstellt werden", fr: "Impossible de creer la facture", it: "Impossibile creare la fattura" },
  "Invoice created successfully.": { es: "Factura creada correctamente.", de: "Rechnung erfolgreich erstellt.", fr: "Facture creee avec succes.", it: "Fattura creata correttamente." },
  "Invoice created successfully": { es: "Factura creada correctamente", de: "Rechnung erfolgreich erstellt", fr: "Facture creee avec succes", it: "Fattura creata correttamente" },
  "Invoice sent successfully.": { es: "Factura enviada correctamente.", de: "Rechnung erfolgreich gesendet.", fr: "Facture envoyee avec succes.", it: "Fattura inviata correttamente." },
  "Optional project or invoice subject": { es: "Proyecto o asunto opcional", de: "Optionales Projekt oder Rechnungsthema", fr: "Projet ou sujet de facture optionnel", it: "Progetto o oggetto fattura opzionale" },
  "Action": { es: "Accion", de: "Aktion", fr: "Action", it: "Azione" },
  "Missing preview data": { es: "Faltan datos de vista previa", de: "Vorschaudaten fehlen", fr: "Donnees d'apercu manquantes", it: "Dati anteprima mancanti" },
  "Please return to invoice creation and complete the required fields.": { es: "Vuelve a la creacion de factura y completa los campos obligatorios.", de: "Bitte zur Rechnungserstellung zurueckkehren und Pflichtfelder ausfuellen.", fr: "Retournez a la creation de facture et completez les champs requis.", it: "Torna alla creazione fattura e completa i campi richiesti." },
  "Review the invoice before final creation.": { es: "Revisa la factura antes de crearla definitivamente.", de: "Pruefe die Rechnung vor der endgueltigen Erstellung.", fr: "Verifiez la facture avant la creation finale.", it: "Rivedi la fattura prima della creazione finale." },
  "Summary": { es: "Resumen", de: "Zusammenfassung", fr: "Resume", it: "Riepilogo" },
  "Client ID": { es: "ID de cliente", de: "Kunden-ID", fr: "ID client", it: "ID cliente" },
  "VAT %": { es: "IVA %", de: "MWST %", fr: "TVA %", it: "IVA %" },
  "Totals": { es: "Totales", de: "Summen", fr: "Totaux", it: "Totali" },
  "Subtotal": { es: "Subtotal", de: "Zwischensumme", fr: "Sous-total", it: "Subtotale" },
  "Loading preview...": { es: "Cargando vista previa...", de: "Vorschau wird geladen...", fr: "Chargement de l'apercu...", it: "Caricamento anteprima..." },
  "Confirm your email first": { es: "Confirma tu email primero", de: "Bestaetige zuerst deine E-Mail", fr: "Confirmez d'abord votre email", it: "Conferma prima l'email" },
  "Open the verification email, then log in again.": { es: "Abre el email de verificacion y vuelve a iniciar sesion.", de: "Oeffne die Bestaetigungs-E-Mail und melde dich erneut an.", fr: "Ouvrez l'email de verification puis reconnectez-vous.", it: "Apri l'email di verifica e accedi di nuovo." },
  "Unable to log in": { es: "No se pudo iniciar sesion", de: "Anmeldung fehlgeschlagen", fr: "Connexion impossible", it: "Accesso non riuscito" },
  "Login incomplete": { es: "Inicio de sesion incompleto", de: "Anmeldung unvollstaendig", fr: "Connexion incomplete", it: "Accesso incompleto" },
  "Login succeeded, but no session token is available.": { es: "El inicio funciono, pero no hay token de sesion.", de: "Anmeldung erfolgreich, aber kein Sitzungstoken verfuegbar.", fr: "Connexion reussie, mais aucun jeton de session.", it: "Accesso riuscito, ma nessun token sessione disponibile." },
  "Account setup failed": { es: "No se pudo configurar la cuenta", de: "Kontoeinrichtung fehlgeschlagen", fr: "Echec de configuration du compte", it: "Configurazione account fallita" },
  "Help & Onboarding": { es: "Ayuda e inicio", de: "Hilfe & Einfuehrung", fr: "Aide et demarrage", it: "Aiuto e guida" },
  "How to send your first invoice": { es: "Como enviar tu primera factura", de: "So sendest du deine erste Rechnung", fr: "Comment envoyer votre premiere facture", it: "Come inviare la prima fattura" },
  "1. Fill in your workspace profile": { es: "1. Completa el perfil del espacio", de: "1. Arbeitsbereich-Profil ausfuellen", fr: "1. Completez le profil de l'espace", it: "1. Completa il profilo spazio" },
  "2. Set your next invoice number": { es: "2. Define tu siguiente numero de factura", de: "2. Naechste Rechnungsnummer festlegen", fr: "2. Definissez le prochain numero", it: "2. Imposta il prossimo numero" },
  "3. Add clients manually or import them": { es: "3. Agrega clientes o importalos", de: "3. Kunden manuell hinzufuegen oder importieren", fr: "3. Ajoutez ou importez des clients", it: "3. Aggiungi o importa clienti" },
  "4. Decide whether you need Stripe": { es: "4. Decide si necesitas Stripe", de: "4. Entscheide, ob du Stripe brauchst", fr: "4. Decidez si Stripe est necessaire", it: "4. Decidi se serve Stripe" },
  "5. Create the first invoice as a draft": { es: "5. Crea la primera factura como borrador", de: "5. Erste Rechnung als Entwurf erstellen", fr: "5. Creez la premiere facture en brouillon", it: "5. Crea la prima fattura come bozza" },
  "6. Add expenses and keep receipts attached": { es: "6. Agrega gastos y adjunta recibos", de: "6. Ausgaben erfassen und Belege anhaengen", fr: "6. Ajoutez depenses et recus", it: "6. Aggiungi spese e ricevute" },
  "Troubleshooting": { es: "Solucion de problemas", de: "Fehlerbehebung", fr: "Depannage", it: "Risoluzione problemi" },
  "Imprint": { es: "Aviso legal", de: "Impressum", fr: "Mentions legales", it: "Imprint" },
  "Operator": { es: "Operador", de: "Betreiber", fr: "Operateur", it: "Operatore" },
  "Main contact": { es: "Contacto principal", de: "Hauptkontakt", fr: "Contact principal", it: "Contatto principale" },
  "Business name, street, postal code, city, and country are required.": { es: "Nombre del negocio, calle, codigo postal, ciudad y pais son obligatorios.", de: "Geschaeftsname, Strasse, Postleitzahl, Stadt und Land sind erforderlich.", fr: "Nom, rue, code postal, ville et pays sont obligatoires.", it: "Nome azienda, via, CAP, citta e paese sono obbligatori." },
  "Invalid business email": { es: "Email del negocio invalido", de: "Ungueltige Geschaefts-E-Mail", fr: "Email entreprise invalide", it: "Email aziendale non valida" },
  "Enter a valid business email address or leave it blank.": { es: "Ingresa un email valido o dejalo en blanco.", de: "Gib eine gueltige Geschaefts-E-Mail ein oder lass sie leer.", fr: "Entrez un email valide ou laissez vide.", it: "Inserisci un'email valida o lascia vuoto." },
  "Invalid IBAN": { es: "IBAN invalido", de: "Ungueltige IBAN", fr: "IBAN invalide", it: "IBAN non valido" },
  "Enter a valid IBAN or leave the field blank.": { es: "Ingresa un IBAN valido o deja el campo en blanco.", de: "Gib eine gueltige IBAN ein oder lass das Feld leer.", fr: "Entrez un IBAN valide ou laissez vide.", it: "Inserisci un IBAN valido o lascia vuoto." },
  "Invalid BIC / SWIFT": { es: "BIC / SWIFT invalido", de: "Ungueltiger BIC / SWIFT", fr: "BIC / SWIFT invalide", it: "BIC / SWIFT non valido" },
  "Enter a valid BIC / SWIFT code or leave the field blank.": { es: "Ingresa un BIC / SWIFT valido o deja el campo en blanco.", de: "Gib einen gueltigen BIC / SWIFT ein oder lass das Feld leer.", fr: "Entrez un BIC / SWIFT valide ou laissez vide.", it: "Inserisci un BIC / SWIFT valido o lascia vuoto." },
  "Invalid next invoice number": { es: "Siguiente numero de factura invalido", de: "Ungueltige naechste Rechnungsnummer", fr: "Prochain numero de facture invalide", it: "Prossimo numero fattura non valido" },
  "Enter a whole number greater than 0 for the next official invoice number.": { es: "Ingresa un numero entero mayor que 0 para la siguiente factura oficial.", de: "Gib eine ganze Zahl groesser als 0 fuer die naechste offizielle Rechnungsnummer ein.", fr: "Entrez un entier superieur a 0 pour le prochain numero officiel.", it: "Inserisci un intero maggiore di 0 per il prossimo numero ufficiale." },
  "TWINT phone number required": { es: "Telefono TWINT obligatorio", de: "TWINT-Telefonnummer erforderlich", fr: "Telephone TWINT obligatoire", it: "Telefono TWINT obbligatorio" },
  "Add the phone number customers should use for TWINT payments.": { es: "Agrega el telefono que los clientes usaran para pagos TWINT.", de: "Fuege die Telefonnummer fuer TWINT-Zahlungen hinzu.", fr: "Ajoutez le numero a utiliser pour les paiements TWINT.", it: "Aggiungi il numero per pagamenti TWINT." },
  "Invalid Swiss VAT number": { es: "Numero IVA suizo invalido", de: "Ungueltige Schweizer MWST-Nummer", fr: "Numero TVA suisse invalide", it: "Numero IVA svizzero non valido" },
  "Use the format CHE-123.456.789 MWST, TVA, or IVA. Your UID alone is not a VAT number.": { es: "Usa el formato CHE-123.456.789 MWST, TVA o IVA. El UID solo no es numero de IVA.", de: "Nutze das Format CHE-123.456.789 MWST, TVA oder IVA. Die UID allein ist keine MWST-Nummer.", fr: "Utilisez le format CHE-123.456.789 MWST, TVA ou IVA. L'UID seul n'est pas un numero TVA.", it: "Usa il formato CHE-123.456.789 MWST, TVA o IVA. Il solo UID non e un numero IVA." },
  "Unable to save settings": { es: "No se pudieron guardar los ajustes", de: "Einstellungen konnten nicht gespeichert werden", fr: "Impossible d'enregistrer les parametres", it: "Impossibile salvare le impostazioni" },
  "Language updated": { es: "Idioma actualizado", de: "Sprache aktualisiert", fr: "Langue mise a jour", it: "Lingua aggiornata" },
  "Unable to update language": { es: "No se pudo actualizar el idioma", de: "Sprache konnte nicht aktualisiert werden", fr: "Impossible de mettre a jour la langue", it: "Impossibile aggiornare la lingua" },
  "The app language could not be saved.": { es: "No se pudo guardar el idioma de la app.", de: "Die App-Sprache konnte nicht gespeichert werden.", fr: "La langue de l'app n'a pas pu etre enregistree.", it: "Impossibile salvare la lingua app." },
  "App installed": { es: "App instalada", de: "App installiert", fr: "App installee", it: "App installata" },
  "Install dismissed": { es: "Instalacion descartada", de: "Installation verworfen", fr: "Installation ignoree", it: "Installazione ignorata" },
  "You can install the app later from the browser menu or prompt.": { es: "Puedes instalar la app luego desde el menu o aviso del navegador.", de: "Du kannst die App spaeter ueber Browsermenue oder Hinweis installieren.", fr: "Vous pouvez installer l'app plus tard depuis le menu ou l'invite.", it: "Puoi installare l'app piu tardi dal menu o prompt." },
  "Install instructions": { es: "Instrucciones de instalacion", de: "Installationsanleitung", fr: "Instructions d'installation", it: "Istruzioni installazione" },
  "Unable to refresh Stripe status": { es: "No se pudo actualizar Stripe", de: "Stripe-Status konnte nicht aktualisiert werden", fr: "Impossible d'actualiser Stripe", it: "Impossibile aggiornare Stripe" },
  "Unable to start Stripe onboarding": { es: "No se pudo iniciar Stripe", de: "Stripe-Onboarding konnte nicht gestartet werden", fr: "Impossible de demarrer Stripe", it: "Impossibile avviare Stripe" },
  "Stripe disconnected": { es: "Stripe desconectado", de: "Stripe getrennt", fr: "Stripe deconnecte", it: "Stripe disconnesso" },
  "This business can now connect a different Stripe account.": { es: "Este negocio ya puede conectar otra cuenta Stripe.", de: "Dieses Geschaeft kann nun ein anderes Stripe-Konto verbinden.", fr: "Cette entreprise peut connecter un autre compte Stripe.", it: "Questa azienda puo collegare un altro account Stripe." },
  "Unable to disconnect Stripe": { es: "No se pudo desconectar Stripe", de: "Stripe konnte nicht getrennt werden", fr: "Impossible de deconnecter Stripe", it: "Impossibile disconnettere Stripe" },
  "Unable to close workspace": { es: "No se pudo cerrar el espacio", de: "Arbeitsbereich konnte nicht geschlossen werden", fr: "Impossible de fermer l'espace", it: "Impossibile chiudere lo spazio" },
  "Load business settings first": { es: "Carga primero los ajustes del negocio", de: "Geschaeftseinstellungen zuerst laden", fr: "Chargez d'abord les parametres entreprise", it: "Carica prima le impostazioni azienda" },
  "Invalid file": { es: "Archivo invalido", de: "Ungueltige Datei", fr: "Fichier invalide", it: "File non valido" },
  "Please upload an image file.": { es: "Sube un archivo de imagen.", de: "Bitte lade eine Bilddatei hoch.", fr: "Televersez un fichier image.", it: "Carica un file immagine." },
  "Logo upload failed": { es: "No se pudo subir el logo", de: "Logo-Upload fehlgeschlagen", fr: "Echec du televersement du logo", it: "Caricamento logo fallito" },
  "Logo uploaded": { es: "Logo subido", de: "Logo hochgeladen", fr: "Logo televerse", it: "Logo caricato" },
  "The business logo was uploaded successfully.": { es: "El logo del negocio se subio correctamente.", de: "Das Geschaeftslogo wurde erfolgreich hochgeladen.", fr: "Le logo entreprise a ete televerse.", it: "Logo azienda caricato correttamente." },
  "Logo removed": { es: "Logo eliminado", de: "Logo entfernt", fr: "Logo supprime", it: "Logo rimosso" },
  "Invoice Sender Preview": { es: "Vista del remitente", de: "Rechnungsabsender-Vorschau", fr: "Apercu expediteur", it: "Anteprima mittente" },
  "Export or archive the invoices, expenses, and payment records your business still needs.": { es: "Exporta o archiva facturas, gastos y pagos que tu negocio aun necesita.", de: "Exportiere oder archiviere Rechnungen, Ausgaben und Zahlungen, die dein Geschaeft braucht.", fr: "Exportez ou archivez factures, depenses et paiements encore necessaires.", it: "Esporta o archivia fatture, spese e pagamenti ancora necessari." },
  "Disconnect Stripe first if you no longer want this workspace tied to a payment account.": { es: "Desconecta Stripe primero si no quieres que el espacio siga vinculado a pagos.", de: "Trenne zuerst Stripe, wenn der Arbeitsbereich nicht mehr mit Zahlungen verbunden sein soll.", fr: "Deconnectez Stripe si l'espace ne doit plus etre lie a un compte paiement.", it: "Disconnetti prima Stripe se non vuoi legare lo spazio a pagamenti." },
  "Use closure only when you are ready to remove access while retained records remain protected.": { es: "Cierra solo cuando estes listo para quitar acceso y conservar registros protegidos.", de: "Schliesse nur, wenn Zugriff entfernt und aufbewahrte Daten geschuetzt bleiben sollen.", fr: "Fermez seulement quand vous etes pret a retirer l'acces tout en protegeant les registres.", it: "Chiudi solo quando sei pronto a rimuovere accesso e proteggere record conservati." },
  "Keep legal retention duties in mind before asking for any personal-data deletion.": { es: "Ten en cuenta obligaciones legales antes de pedir borrar datos personales.", de: "Beachte gesetzliche Aufbewahrungspflichten vor Loeschanfragen.", fr: "Gardez les obligations legales en tete avant toute suppression de donnees.", it: "Considera obblighi legali prima di chiedere cancellazioni dati." },
  "Disconnect this Stripe account from the business? Card payments will stop until a new Stripe account is connected.": { es: "Desconectar esta cuenta Stripe? Los pagos con tarjeta se detendran hasta conectar otra.", de: "Dieses Stripe-Konto trennen? Kartenzahlungen stoppen bis ein neues Konto verbunden ist.", fr: "Deconnecter ce compte Stripe ? Les cartes s'arretent jusqu'a un nouveau compte.", it: "Disconnettere questo account Stripe? Le carte si fermano finche ne colleghi uno nuovo." },
  "Close this workspace now? Access will be removed, Stripe will be disconnected where applicable, and legally required records may still be retained.": { es: "Cerrar este espacio ahora? Se quitara acceso, Stripe se desconectara si aplica y registros legales pueden conservarse.", de: "Arbeitsbereich jetzt schliessen? Zugriff wird entfernt, Stripe ggf. getrennt und rechtliche Daten koennen bleiben.", fr: "Fermer cet espace maintenant ? Acces retire, Stripe deconnecte si applicable et registres conserves.", it: "Chiudere lo spazio ora? Accesso rimosso, Stripe disconnesso se applicabile e record conservati." },
  "Current password required": { es: "Contrasena actual obligatoria", de: "Aktuelles Passwort erforderlich", fr: "Mot de passe actuel requis", it: "Password attuale richiesta" },
  "Enter your current password before setting a new one.": { es: "Ingresa tu contrasena actual antes de crear una nueva.", de: "Gib dein aktuelles Passwort ein, bevor du ein neues setzt.", fr: "Entrez le mot de passe actuel avant d'en definir un nouveau.", it: "Inserisci la password attuale prima di impostarne una nuova." },
  "Password too short": { es: "Contrasena demasiado corta", de: "Passwort zu kurz", fr: "Mot de passe trop court", it: "Password troppo corta" },
  "Use at least 8 characters for the new password.": { es: "Usa al menos 8 caracteres para la nueva contrasena.", de: "Nutze mindestens 8 Zeichen fuer das neue Passwort.", fr: "Utilisez au moins 8 caracteres.", it: "Usa almeno 8 caratteri." },
  "Passwords do not match": { es: "Las contrasenas no coinciden", de: "Passwoerter stimmen nicht ueberein", fr: "Les mots de passe ne correspondent pas", it: "Le password non coincidono" },
  "Please repeat the same new password.": { es: "Repite la misma nueva contrasena.", de: "Bitte wiederhole dasselbe neue Passwort.", fr: "Repetez le meme nouveau mot de passe.", it: "Ripeti la stessa nuova password." },
  "Could not verify the current account.": { es: "No se pudo verificar la cuenta actual.", de: "Aktuelles Konto konnte nicht geprueft werden.", fr: "Impossible de verifier le compte actuel.", it: "Impossibile verificare l'account attuale." },
  "Current password is incorrect.": { es: "La contrasena actual es incorrecta.", de: "Das aktuelle Passwort ist falsch.", fr: "Le mot de passe actuel est incorrect.", it: "La password attuale e errata." },
  "Password updated": { es: "Contrasena actualizada", de: "Passwort aktualisiert", fr: "Mot de passe mis a jour", it: "Password aggiornata" },
  "Unable to update password": { es: "No se pudo actualizar la contrasena", de: "Passwort konnte nicht aktualisiert werden", fr: "Impossible de mettre a jour le mot de passe", it: "Impossibile aggiornare la password" },
  "Change Password": { es: "Cambiar contrasena", de: "Passwort aendern", fr: "Changer le mot de passe", it: "Cambia password" },
  "Close navigation": { es: "Cerrar navegacion", de: "Navigation schliessen", fr: "Fermer navigation", it: "Chiudi navigazione" },
  "Quick Summary": { es: "Resumen rapido", de: "Kurze Zusammenfassung", fr: "Resume rapide", it: "Riepilogo rapido" },
  "Select a client to see billing details.": { es: "Selecciona un cliente para ver detalles.", de: "Waehle einen Kunden fuer Abrechnungsdetails.", fr: "Selectionnez un client pour les details.", it: "Seleziona un cliente per dettagli." },
  "Schedule": { es: "Calendario", de: "Zeitplan", fr: "Calendrier", it: "Programma" },
  "Open navigation": { es: "Abrir navegacion", de: "Navigation oeffnen", fr: "Ouvrir navigation", it: "Apri navigazione" },
  "Searching...": { es: "Buscando...", de: "Suche...", fr: "Recherche...", it: "Ricerca..." },
  "Open notifications": { es: "Abrir notificaciones", de: "Benachrichtigungen oeffnen", fr: "Ouvrir notifications", it: "Apri notifiche" },
  "Loading notifications...": { es: "Cargando notificaciones...", de: "Benachrichtigungen werden geladen...", fr: "Chargement notifications...", it: "Caricamento notifiche..." },
  "Open account menu": { es: "Abrir menu de cuenta", de: "Kontomenue oeffnen", fr: "Ouvrir menu compte", it: "Apri menu account" },
  "Dismiss notification": { es: "Descartar notificacion", de: "Benachrichtigung schliessen", fr: "Fermer notification", it: "Ignora notifica" },
  "Invoices": { es: "Facturas", de: "Rechnungen", fr: "Factures", it: "Fatture" },
  "Consulting": { es: "Consultoria", de: "Beratung", fr: "Conseil", it: "Consulenza" },
  "Strategy session": { es: "Sesion estrategica", de: "Strategie-Sitzung", fr: "Session strategie", it: "Sessione strategica" },
  "Open plan details": { es: "Abrir detalles del plan", de: "Plandetails oeffnen", fr: "Ouvrir details du plan", it: "Apri dettagli piano" },
  "Complimentary Pro is active on this workspace. No Stripe subscription is required.": { es: "Pro gratuito esta activo en este espacio. No se requiere suscripcion Stripe.", de: "Kostenloses Pro ist fuer diesen Arbeitsbereich aktiv. Kein Stripe-Abo erforderlich.", fr: "Pro offert est actif. Aucun abonnement Stripe requis.", it: "Pro gratuito e attivo. Nessun abbonamento Stripe richiesto." },
  "Loading billing details...": { es: "Cargando detalles de facturacion...", de: "Abrechnungsdetails werden geladen...", fr: "Chargement details facturation...", it: "Caricamento dettagli fatturazione..." },
  "Usage this month": { es: "Uso este mes", de: "Nutzung diesen Monat", fr: "Utilisation ce mois", it: "Uso questo mese" },
  "Upgrade to keep issuing invoices": { es: "Mejora para seguir emitiendo facturas", de: "Upgrade, um weiter Rechnungen auszustellen", fr: "Passez au niveau superieur pour continuer", it: "Aggiorna per continuare a emettere fatture" },
  "What stays available": { es: "Lo que sigue disponible", de: "Was verfuegbar bleibt", fr: "Ce qui reste disponible", it: "Cosa resta disponibile" },
  "Back": { es: "Volver", de: "Zurueck", fr: "Retour", it: "Indietro" },
  "Back to home": { es: "Volver al inicio", de: "Zurueck zur Startseite", fr: "Retour a l'accueil", it: "Torna alla home" },
  "Review before production": { es: "Revisar antes de produccion", de: "Vor Produktion pruefen", fr: "Verifier avant production", it: "Rivedi prima della produzione" },
  "Back to top": { es: "Volver arriba", de: "Nach oben", fr: "Retour en haut", it: "Torna su" },
  "Open the invoice builder": { es: "Abrir creador de facturas", de: "Rechnungserstellung oeffnen", fr: "Ouvrir le createur de facture", it: "Apri builder fatture" },
  "Create a new client profile": { es: "Crear nuevo perfil de cliente", de: "Neues Kundenprofil erstellen", fr: "Creer un nouveau profil client", it: "Crea nuovo profilo cliente" },
  "Track a new business cost": { es: "Registrar nuevo gasto del negocio", de: "Neue Geschaeftsausgabe erfassen", fr: "Suivre un nouveau cout pro", it: "Registra nuovo costo aziendale" },
  "Jump straight to collections work": { es: "Ir directo a cobros", de: "Direkt zur Inkassoarbeit", fr: "Aller directement aux recouvrements", it: "Vai subito agli incassi" },
  "Review performance and profitability": { es: "Revisar rendimiento y rentabilidad", de: "Leistung und Rentabilitaet pruefen", fr: "Verifier performance et rentabilite", it: "Rivedi performance e redditivita" },
  "Notifications request failed": { es: "Fallo al cargar notificaciones", de: "Benachrichtigungsanfrage fehlgeschlagen", fr: "Echec demande notifications", it: "Richiesta notifiche fallita" },
  "You can install the app later from the browser prompt.": { es: "Puedes instalar la app luego desde el aviso del navegador.", de: "Du kannst die App spaeter ueber den Browserhinweis installieren.", fr: "Vous pouvez installer l'app plus tard depuis l'invite navigateur.", it: "Puoi installare l'app piu tardi dal prompt browser." },
  "Install on iPhone or iPad": { es: "Instalar en iPhone o iPad", de: "Auf iPhone oder iPad installieren", fr: "Installer sur iPhone ou iPad", it: "Installa su iPhone o iPad" },
  "Open the Share menu in Safari, then choose Add to Home Screen.": { es: "Abre Compartir en Safari y elige Agregar a pantalla de inicio.", de: "Oeffne das Teilen-Menue in Safari und waehle Zum Home-Bildschirm.", fr: "Ouvrez Partager dans Safari puis Ajouter a l'ecran d'accueil.", it: "Apri Condividi in Safari e scegli Aggiungi a Home." },
  "Install not available yet": { es: "Instalacion aun no disponible", de: "Installation noch nicht verfuegbar", fr: "Installation pas encore disponible", it: "Installazione non ancora disponibile" },
  "Use a supported browser and visit the app again after a short moment.": { es: "Usa un navegador compatible y vuelve a abrir la app en un momento.", de: "Nutze einen unterstuetzten Browser und oeffne die App gleich erneut.", fr: "Utilisez un navigateur compatible et revenez dans un instant.", it: "Usa un browser supportato e torna tra poco." },
  "Invoicing solutions for freelancers": { es: "Soluciones de facturacion para freelancers", de: "Rechnungsloesungen fuer Freelancer", fr: "Solutions de facturation pour independants", it: "Soluzioni fatturazione per freelance" },
  "Notice": { es: "Aviso", de: "Hinweis", fr: "Avis", it: "Avviso" },
};

const APP_UI_PHRASES = {
  ...UI_PHRASES,
  ...EXTRA_UI_PHRASES,
};

const TRANSLATABLE_ATTRIBUTES = ["placeholder", "aria-label", "title"] as const;
const APP_LANGUAGE_STORAGE_KEY = "sierra-invoices-app-language";

function readStoredAppLanguage() {
  if (typeof window === "undefined") return DEFAULT_APP_LANGUAGE;
  return normalizeAppLanguage(window.localStorage.getItem(APP_LANGUAGE_STORAGE_KEY));
}

function storeAppLanguage(language: AppLanguage) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(APP_LANGUAGE_STORAGE_KEY, language);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildPhraseRegExp(phrase: string) {
  const startsWithWord = /^[A-Za-z0-9]/.test(phrase);
  const endsWithWord = /[A-Za-z0-9]$/.test(phrase);
  return new RegExp(
    `${startsWithWord ? "\\b" : ""}${escapeRegExp(phrase)}${endsWithWord ? "\\b" : ""}`,
    "g"
  );
}

const SORTED_UI_PHRASES = Object.keys(APP_UI_PHRASES).sort((left, right) => right.length - left.length);

function translateUiPhrase(phrase: string, language: AppLanguage) {
  if (language === "en") return phrase;
  const exactTranslation = APP_UI_PHRASES[phrase]?.[language];
  if (exactTranslation) return exactTranslation;

  return SORTED_UI_PHRASES.reduce((translated, sourcePhrase) => {
    const replacement = APP_UI_PHRASES[sourcePhrase]?.[language];
    if (!replacement || !translated.includes(sourcePhrase)) {
      return translated;
    }

    return translated.replace(buildPhraseRegExp(sourcePhrase), replacement);
  }, phrase);
}

function getKnownUiVariants(phrase: string) {
  const translations = APP_UI_PHRASES[phrase];
  return new Set([phrase, ...Object.values(translations ?? {})]);
}

function preserveOuterWhitespace(original: string, translated: string) {
  const leading = original.match(/^\s*/)?.[0] ?? "";
  const trailing = original.match(/\s*$/)?.[0] ?? "";
  return `${leading}${translated}${trailing}`;
}

function attributeOriginalName(attribute: (typeof TRANSLATABLE_ATTRIBUTES)[number]) {
  return `data-ui-original-${attribute.replace(/[^a-z]/gi, "-")}`;
}

type AppLanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => Promise<void>;
  t: (key: keyof typeof DICTIONARY.en) => string;
  options: typeof APP_LANGUAGE_OPTIONS;
};

const AppLanguageContext = createContext<AppLanguageContextValue | null>(null);

function useUiDomTranslations(language: AppLanguage) {
  const originalTextNodesRef = useRef<WeakMap<Text, string>>(new WeakMap());
  const translatedTextNodesRef = useRef<WeakMap<Text, string>>(new WeakMap());
  const isApplyingTranslationsRef = useRef(false);

  useEffect(() => {
    if (typeof document === "undefined" || !document.body) return;

    let animationFrame: number | null = null;
    const originalTextNodes = originalTextNodesRef.current;
    const translatedTextNodes = translatedTextNodesRef.current;

    const shouldSkipElement = (element: Element | null) => {
      if (!element) return true;
      return Boolean(element.closest("script, style, textarea, noscript, [data-no-translate]"));
    };

    const applyTextTranslation = (node: Text) => {
      if (shouldSkipElement(node.parentElement)) return;

      const current = node.textContent ?? "";
      const lastTranslated = translatedTextNodes.get(node);
      let original = originalTextNodes.get(node);
      if (original && current !== lastTranslated) {
        const currentTrimmed = current.trim();
        const originalTrimmed = original.trim();
        if (currentTrimmed && !getKnownUiVariants(originalTrimmed).has(currentTrimmed)) {
          original = current;
          originalTextNodes.set(node, original);
        }
      } else {
        original = current;
        originalTextNodes.set(node, original);
      }

      const trimmed = original.trim();
      if (!trimmed) return;

      const translated = translateUiPhrase(trimmed, language);
      const next = preserveOuterWhitespace(original, translated);
      if (node.textContent !== next) {
        node.textContent = next;
      }
      translatedTextNodes.set(node, next);
    };

    const applyAttributeTranslation = (element: Element) => {
      if (shouldSkipElement(element)) return;

      TRANSLATABLE_ATTRIBUTES.forEach((attribute) => {
        const current = element.getAttribute(attribute);
        if (!current) return;

        const originalAttribute = attributeOriginalName(attribute);
        const translatedAttribute = `data-ui-translated-${attribute.replace(/[^a-z]/gi, "-")}`;
        const lastTranslated = element.getAttribute(translatedAttribute);
        let original = element.getAttribute(originalAttribute);
        if (!element.hasAttribute(originalAttribute)) {
          original = current;
          element.setAttribute(originalAttribute, original);
        } else if (original && current !== lastTranslated) {
          const currentTrimmed = current.trim();
          const originalTrimmed = original.trim();
          if (currentTrimmed && !getKnownUiVariants(originalTrimmed).has(currentTrimmed)) {
            original = current;
            element.setAttribute(originalAttribute, original);
          }
        }

        if (!original) return;
        const trimmed = original.trim();
        if (!trimmed) return;

        const translated = translateUiPhrase(trimmed, language);
        const next = preserveOuterWhitespace(original, translated);
        if (element.getAttribute(attribute) !== next) {
          element.setAttribute(attribute, next);
        }
        element.setAttribute(translatedAttribute, next);
      });
    };

    const applyTranslations = () => {
      isApplyingTranslationsRef.current = true;
      try {
        document.documentElement.lang = language;

        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node = walker.nextNode();
        while (node) {
          applyTextTranslation(node as Text);
          node = walker.nextNode();
        }

        document
          .querySelectorAll(TRANSLATABLE_ATTRIBUTES.map((attribute) => `[${attribute}]`).join(","))
          .forEach(applyAttributeTranslation);
      } finally {
        isApplyingTranslationsRef.current = false;
      }
    };

    const scheduleTranslations = () => {
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }

      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = null;
        applyTranslations();
      });
    };

    const observer = new MutationObserver(() => {
      if (isApplyingTranslationsRef.current) return;
      scheduleTranslations();
    });

    scheduleTranslations();
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: [...TRANSLATABLE_ATTRIBUTES],
      characterData: true,
      childList: true,
      subtree: true,
    });

    return () => {
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }
      observer.disconnect();
    };
  }, [language]);
}

export function AppLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(() => readStoredAppLanguage());

  useUiDomTranslations(language);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const response = await authenticatedFetch("/api/account", { cache: "no-store" });
        if (!response.ok) return;
        const account = (await response.json()) as { appLanguage?: string };
        const normalized = normalizeAppLanguage(account.appLanguage);
        storeAppLanguage(normalized);
        if (mounted) {
          setLanguageState(normalized);
        }
      } catch (error) {
        console.error("Unable to load app language:", error);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<AppLanguageContextValue>(() => ({
    language,
    options: APP_LANGUAGE_OPTIONS,
    t: (key) => DICTIONARY[language][key] ?? DICTIONARY.en[key],
    setLanguage: async (nextLanguage) => {
      const normalized = normalizeAppLanguage(nextLanguage);
      setLanguageState(normalized);
      storeAppLanguage(normalized);
      const response = await authenticatedFetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appLanguage: normalized }),
      });

      if (!response.ok) {
        throw new Error("Unable to update app language");
      }
    },
  }), [language]);

  return <AppLanguageContext.Provider value={value}>{children}</AppLanguageContext.Provider>;
}

export function StaticAppLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(() => readStoredAppLanguage());

  useUiDomTranslations(language);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === APP_LANGUAGE_STORAGE_KEY) {
        setLanguageState(normalizeAppLanguage(event.newValue));
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const value = useMemo<AppLanguageContextValue>(() => ({
    language,
    options: APP_LANGUAGE_OPTIONS,
    t: (key) => DICTIONARY[language][key] ?? DICTIONARY.en[key],
    setLanguage: async () => {},
  }), [language]);

  return <AppLanguageContext.Provider value={value}>{children}</AppLanguageContext.Provider>;
}

export function useAppLanguage() {
  const context = useContext(AppLanguageContext);
  if (!context) {
    throw new Error("useAppLanguage must be used within AppLanguageProvider");
  }

  return context;
}
