import { Component, OnInit, Pipe, PipeTransform } from '@angular/core';
import { Poste } from '../model/poste';
import { PosteService } from '../service/poste.service';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { DirectionService } from '../../direction/service/direction.service';
import { Direction } from '../../direction/model/Direction';
import { MultiSelectModule } from 'primeng/multiselect';
import { PosteDTO } from '../model/PosteDTO';
import { SafeResourceUrl,DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { PDFDocument } from 'pdf-lib';
import * as Mammoth from 'mammoth';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { FileUploadModule } from 'primeng/fileupload';
import { CompetencePoste } from '../model/competenceposte';
import { CompetencePosteService } from '../service/competenceposte.service';
import { BadgeModule } from 'primeng/badge';
@Pipe({ name: 'truncate' })
export class TruncatePipe implements PipeTransform {
  transform(value: string, limit: number = 50, trail: string = '...'): string {
    return value?.length > limit ? value.substring(0, limit) + trail : value;
  }}
@Component({
  selector: 'app-list-poste',
  standalone: true,
  imports: [
    TagModule,
    FileUploadModule,
    CommonModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    FormsModule,
    DialogModule,
    MultiSelectModule,
    TooltipModule,
    ProgressBarModule,
    BadgeModule
   
  ],
  templateUrl: './list-poste.component.html',
  styleUrl: './list-poste.component.css'
})
export class ListPosteComponent implements OnInit {
  fileContent: SafeHtml = '';
  selectedFile: File | null = null;
  postes: Poste[] = [];
  selectedPostes: Poste[] = [];
  searchText: string = '';
  visibleUpdateDialog: boolean = false;
  selectedPoste: Poste = new Poste();
  visible: boolean = false;
  visibleAddDialog: boolean = false;
  directions: Direction[] = [];
  selectedDirectionIds: number[] = []; // Stocke uniquement les ID des directions sélectionnées
  loading: boolean = false; 
  newPoste: any = {};  // Nouveau poste à ajouter
  competences: CompetencePoste[] = []; // Add this line
  selectedCompetenceIds: number[] = []; 
  
  documentUrl: string | null = null;
  // Méthode pour ouvrir le dialogue de modification
  safeDocumentUrl: SafeResourceUrl | null = null;

  constructor(private posteService: PosteService,private directionservice: DirectionService,private sanitizer: DomSanitizer,
    private competenceService: CompetencePosteService
  ) {}
  loadCompetences(): void {
    this.competenceService.getAllCompetences().subscribe(
      (data) => {
        this.competences = data;
      },
      (error) => {
        console.error('Error loading competences', error);
      }
    );
  }

  onDocumentSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      this.selectedFile = file;
      this.loadDocument(file);
    } else {
      console.error('Le fichier sélectionné n\'est pas un PDF.');
    }
  }

  async loadDocument(document: File | string): Promise<void> {
    if (document instanceof File) {
      const url = window.URL.createObjectURL(document);
      this.safeDocumentUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    } else if (typeof document === 'string') {
      // Gérer le cas où le document est une chaîne (par exemple, Base64)
      this.safeDocumentUrl = await this.getSafeUrl(document);
    } else {
      console.error('Format de document non supporté');
    }
  }
  
  
// Méthode pour vérifier si le document est un PDF
isPdf(document: File | string): boolean {
  if (document instanceof File) {
    return document.type === 'application/pdf';
  } else if (typeof document === 'string') {
    return document.startsWith('JVBERi0'); // Vérifie si la chaîne Base64 est un PDF
  }
  return false;
}


  async getSafeUrl(document: File | string): Promise<SafeResourceUrl> {
    try {
      let pdfBytes: Uint8Array;

      if (document instanceof File) {
        const arrayBuffer = await document.arrayBuffer();
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage();
        pdfBytes = await pdfDoc.save();
      } else if (typeof document === 'string') {
        const byteCharacters = atob(document);
        const byteArray = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteArray[i] = byteCharacters.charCodeAt(i);
        }
        pdfBytes = byteArray;
      } else {
        throw new Error('Format de document non supporté');
      }

      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      return this.sanitizer.bypassSecurityTrustResourceUrl(url);
    } catch (error) {
      console.error('Erreur lors de la conversion du fichier Word en PDF :', error);
      return this.sanitizer.bypassSecurityTrustResourceUrl('');
    }
  }


  ngOnInit(): void {
    this.loadPostes();
    this.getDirections();
    this.loadCompetences(); 
  }
  onFileChange(event: any): void {
    const file: File = event.target.files[0]; // Récupère le fichier sélectionné

    if (file) {
      // Créer une URL Blob pour afficher le fichier
      this.createBlobUrl(file);
    }
  }

  // Méthode pour convertir le fichier en URL Blob
  createBlobUrl(file: File): void {
    const fileReader = new FileReader();
    
    fileReader.onload = (e) => {
      const blob = new Blob([e.target?.result as ArrayBuffer], { type: file.type });
      this.documentUrl = window.URL.createObjectURL(blob); // Créer l'URL Blob
    };
    
    fileReader.readAsArrayBuffer(file); // Lire le fichier en tant qu'ArrayBuffer
  }
  ajouterPoste() {
    console.log("📌 Directions sélectionnées (IDs) :", this.selectedDirectionIds);
    console.log("📌 Fichier sélectionné :", this.selectedFile);

    // Créer un FormData pour envoyer les données
    const formData = new FormData();
    formData.append('titre', this.newPoste.titre);
    formData.append('niveauExperience', this.newPoste.niveauExperience);
    formData.append('diplomeRequis', this.newPoste.diplomeRequis);
    formData.append('competencesRequises', this.newPoste.competencesRequises);
    this.newPoste.lesProgrammesDeFormation.forEach((programme :string)=> {
      if (programme.trim()) { // Ne pas envoyer les champs vides
          formData.append('lesProgrammesDeFormation', programme);
      }
  });
    // Ajouter chaque directionId séparément dans FormData
    this.selectedDirectionIds.forEach(directionId => {
        formData.append('directionIds', directionId.toString());  // Ajoute chaque ID de direction comme une entrée séparée
    });
    this.selectedCompetenceIds.forEach(id => {
      formData.append('competencePosteIds', id.toString());
    });

    // Ajouter le fichier s'il existe
    if (this.selectedFile) {
        formData.append('document', this.selectedFile);
    }

    console.log("📌 Données envoyées à l'API :", formData);

    // Appel du service pour ajouter le poste avec le fichier
    this.posteService.ajouterPoste(formData).subscribe(
        response => {
            console.log("✅ Poste ajouté avec succès :", response);
            this.resetForm();
            this.visibleAddDialog = false;
            this.loadPostes(); // Rafraîchir la liste après l'ajout
        },
        error => {
            console.error("❌ Erreur lors de l'ajout :", error);
        }
    );
}
ajouterProgramme() {
  if (!this.newPoste.lesProgrammesDeFormation) {
    this.newPoste.lesProgrammesDeFormation = [];
  }
  this.newPoste.lesProgrammesDeFormation.push(''); // Ajoute un champ vide
}

supprimerProgramme(index: number) {
  if (this.newPoste.lesProgrammesDeFormation) {
    this.newPoste.lesProgrammesDeFormation.splice(index, 1);
  }
}
resetForm() {
  // Réinitialiser l'objet newPoste
  this.newPoste = {
    titre: '',
    niveauExperience: '',
    diplomeRequis: '',
    competencesRequises: '',
    lesProgrammesDeFormation: []
  };
  
  // Réinitialiser les directions sélectionnées
  this.selectedDirectionIds = [];
  
  // Réinitialiser le fichier sélectionné
  this.selectedFile = null;
  this.selectedCompetenceIds = [];
  // Réinitialiser l'input file (si besoin)
  const fileInput = document.getElementById('document') as HTMLInputElement;
  if (fileInput) {
      fileInput.value = '';
  }


}
onProgrammeChange(value: string, index: number): void {
  if (!this.selectedPoste.lesProgrammesDeFormation) {
    this.selectedPoste.lesProgrammesDeFormation = [];
  }

  // Copie du tableau pour forcer la détection de changement
  const programmes = [...this.selectedPoste.lesProgrammesDeFormation];
  programmes[index] = value;
  this.selectedPoste.lesProgrammesDeFormation = programmes;
}
trackByIndex(index: number, item: string): number {
  return index;
}

ajouterProgrammeModif() {
  if (!this.selectedPoste.lesProgrammesDeFormation) {
    this.selectedPoste.lesProgrammesDeFormation = [];
  }
  this.selectedPoste.lesProgrammesDeFormation.push('');
}

supprimerProgrammeModif(index: number) {
  if (this.selectedPoste.lesProgrammesDeFormation) {
    this.selectedPoste.lesProgrammesDeFormation.splice(index, 1);
  }
}

updatePoste(): void {
  if (!this.selectedPoste.id) {
    console.error("❌ Erreur : l'ID du poste sélectionné est manquant !");
    return;
  }

  // Créer un FormData pour envoyer les données
  const formData = new FormData();

  // Ajouter les champs texte du Poste
  formData.append('titre', this.selectedPoste.titre);
  formData.append('niveauExperience', this.selectedPoste.niveauExperience);
  formData.append('diplomeRequis', this.selectedPoste.diplomeRequis);
  formData.append('competencesRequises', this.selectedPoste.competencesRequises);
if (this.selectedPoste.lesProgrammesDeFormation && this.selectedPoste.lesProgrammesDeFormation.length > 0) {
  this.selectedPoste.lesProgrammesDeFormation.forEach(programme => {
    formData.append('lesProgrammesDeFormation', programme);
  });
}
  this.selectedCompetenceIds.forEach(id => {
    formData.append('competencePosteIds', id.toString());
  });
  // Ajouter chaque directionId séparément dans FormData
  this.selectedDirectionIds.forEach(directionId => {
    formData.append('directionIds', directionId.toString());
  });

  // Ajouter le fichier s'il existe
  if (this.selectedFile) {
    formData.append('document', this.selectedFile);
  }

  console.log("📌 Données envoyées à l'API :", formData);

  // Appel du service pour mettre à jour le poste avec le fichier
  this.posteService.updatePoste(this.selectedPoste.id, formData).subscribe(
    (response) => {
      console.log("✅ Poste mis à jour avec succès :", response);

      // Met à jour la liste des postes sans recharger toute la page
      this.postes = this.postes.map(p =>
        p.id === this.selectedPoste.id ? { ...p, ...response, id: p.id } : p
      );

      this.visibleUpdateDialog = false; // Ferme la boîte de dialogue après la mise à jour
    },
    (error) => {
      console.error("❌ Erreur lors de la mise à jour :", error);
    }
  );
}


onFileSelected(event: any) {
  const file: File = event.target.files[0];
  if (file) {
      this.selectedFile = file;  // Enregistrez le fichier sélectionné
      console.log("📌 Fichier sélectionné :", this.selectedFile);
  }
}


  getDirections(): void {
    this.directionservice.getAllDirections().subscribe(
      (data) => {
        this.directions = data;
        console.log('Directions archivées récupérées avec succès', data);
      },
      (error) => {
        console.error('Erreur lors de la récupération des directions archivées', error);
      }
    );
  }
  openAddDialog() {
    this.newPoste = {};  // Réinitialise le nouveau poste
    this.visibleAddDialog = true;
}

  openEditDialog(poste: Poste): void {
    
    this.selectedPoste = { ...poste }; 
    console.log('postebyidd : ',this.selectedPoste);
    this.safeDocumentUrl = null; // Réinitialiser l'URL sécurisée

   
  
    this.posteService.getDirectionsByPosteId(poste.id!).subscribe(
      (data) => {
        this.selectedDirectionIds = data.map((direction: any) => direction.id); // Récupère uniquement les IDs
        this.visibleUpdateDialog = true; // Afficher la boîte de dialogue
     
     
     
      },
      (error) => {
        console.error('Erreur lors de la récupération des directions du poste', error);
      }
    );

    if (poste.competencePostes && poste.competencePostes.length > 0) {
      this.selectedCompetenceIds = poste.competencePostes.map(c => c.id!);
    } else {
      this.selectedCompetenceIds = [];
    }
  }



   
  
  
  

  loadPostes(): void {
    this.posteService.getAllPostesnonArchives().subscribe((data) => {
      this.postes = data;
      console.log(data);
    });
  }

 displayDeleteDialog: boolean = false;
posteToDelete: Poste | null = null;

deletePoste(poste: Poste): void {
  this.posteToDelete = poste;
  this.displayDeleteDialog = true;
}

confirmDelete(): void {
  if (this.posteToDelete) {
    this.posteService.archiverPoste(this.posteToDelete.id!).subscribe(() => {
      this.postes = this.postes.filter(p => p.id !== this.posteToDelete?.id);
      this.displayDeleteDialog = false;
      this.posteToDelete = null;
    });
  }
}

  exportPostes(): void {
    if (this.selectedPostes.length > 0) {
      const csvData = this.convertToCSV(this.selectedPostes); 
      this.downloadCSV(csvData);
    } else {
      const csvData = this.convertToCSV(this.postes); 
      this.downloadCSV(csvData);
    }
  }
  
  
  convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
  
    const headers = Object.keys(data[0]); 
    const rows = data.map(row => headers.map(header => row[header]).join(','));
  
    return [headers.join(','), ...rows].join('\n');
  }
  
  downloadCSV(csvData: string): void {
    const blob = new Blob([csvData], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Postes.csv';
    link.click();
  }

  editPoste(poste: Poste): void {
    this.selectedPoste = { ...poste };
    this.visibleUpdateDialog = true;
  }


  // Dans votre composant TypeScript
  getExperienceClass(experience: string): string {
    switch(experience.toLowerCase()) {
      case 'junior': return 'experience-junior';
      case 'intermédiaire': return 'experience-intermediaire';
      case 'senior': return 'experience-senior';
      case 'expert': return 'experience-expert';
      default: return '';
    }
  }
  
  getCompetencesList(competences: string): string[] {
    return competences.split(',').map(c => c.trim());
  }
  
  getSeverity(niveau: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (niveau.toLowerCase()) {
        case 'débutant': return 'info';
        case 'intermédiaire': return 'success';
        case 'avancé': return 'warn';     
        case 'expert': return 'danger';
        default: return 'info';
    }
}
getCompetencesNames(competencePostes: CompetencePoste[] | undefined): string {
  if (!competencePostes || competencePostes.length === 0) {
    return 'Aucune compétence spécifiée';
  }
  return competencePostes.map(c => c.nom).join(', ');
}
  
}