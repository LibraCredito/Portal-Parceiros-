// Utilitários para IndexedDB - Portal Parceiros
const DB_NAME = 'PortalParceirosDB';
const DB_VERSION = 1;

// Stores do IndexedDB
const STORES = {
  DOCUMENTS: 'documents',
  METADATA: 'metadata'
};

// Interface para documentos no IndexedDB
export interface DocumentData {
  id: string;
  tomadorIndex: number;
  documentType: 'identificacao' | 'comprovante' | 'certificado' | 'holerite_extrato';
  fileName: string;
  fileData: ArrayBuffer;
  mimeType: string;
  uploaded: boolean;
  filePath?: string;
  tipo?: 'holerite' | 'extrato';
  campoId?: string;
  createdAt: number;
}

// Interface para metadados
export interface DocumentMetadata {
  id: string;
  tomadorIndex: number;
  documentType: string;
  fileName: string;
  uploaded: boolean;
  filePath?: string;
  tipo?: string;
  campoId?: string;
  createdAt: number;
}

class IndexedDBManager {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Criar store para documentos (arquivos binários)
        if (!db.objectStoreNames.contains(STORES.DOCUMENTS)) {
          const documentStore = db.createObjectStore(STORES.DOCUMENTS, { keyPath: 'id' });
          documentStore.createIndex('tomadorIndex', 'tomadorIndex', { unique: false });
          documentStore.createIndex('documentType', 'documentType', { unique: false });
          documentStore.createIndex('tomadorDocumentType', ['tomadorIndex', 'documentType'], { unique: false });
        }

        // Criar store para metadados (dados pequenos)
        if (!db.objectStoreNames.contains(STORES.METADATA)) {
          const metadataStore = db.createObjectStore(STORES.METADATA, { keyPath: 'id' });
          metadataStore.createIndex('tomadorIndex', 'tomadorIndex', { unique: false });
          metadataStore.createIndex('documentType', 'documentType', { unique: false });
        }
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    return this.db!;
  }

  // Salvar documento completo (arquivo + metadados)
  async saveDocument(documentData: DocumentData): Promise<void> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.DOCUMENTS, STORES.METADATA], 'readwrite');
      
      // Salvar arquivo completo
      const documentStore = transaction.objectStore(STORES.DOCUMENTS);
      documentStore.add(documentData);

      // Salvar apenas metadados
      const metadataStore = transaction.objectStore(STORES.METADATA);
      const metadata: DocumentMetadata = {
        id: documentData.id,
        tomadorIndex: documentData.tomadorIndex,
        documentType: documentData.documentType,
        fileName: documentData.fileName,
        uploaded: documentData.uploaded,
        filePath: documentData.filePath,
        tipo: documentData.tipo,
        campoId: documentData.campoId,
        createdAt: documentData.createdAt
      };
      metadataStore.add(metadata);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Obter documento completo
  async getDocument(id: string): Promise<DocumentData | null> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.DOCUMENTS], 'readonly');
      const store = transaction.objectStore(STORES.DOCUMENTS);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  // Obter apenas metadados
  async getMetadata(id: string): Promise<DocumentMetadata | null> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.METADATA], 'readonly');
      const store = transaction.objectStore(STORES.METADATA);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  // Obter todos os metadados de um tipo de documento
  async getAllMetadataByType(documentType: string): Promise<DocumentMetadata[]> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.METADATA], 'readonly');
      const store = transaction.objectStore(STORES.METADATA);
      const index = store.index('documentType');
      const request = index.getAll(documentType);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Obter metadados por tomador e tipo
  async getMetadataByTomadorAndType(tomadorIndex: number, documentType: string): Promise<DocumentMetadata[]> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.METADATA], 'readonly');
      const store = transaction.objectStore(STORES.METADATA);
      const index = store.index('tomadorDocumentType');
      const request = index.getAll([tomadorIndex, documentType]);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Atualizar status de upload
  async updateUploadStatus(id: string, uploaded: boolean, filePath?: string): Promise<void> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.DOCUMENTS, STORES.METADATA], 'readwrite');
      
      // Atualizar documento completo
      const documentStore = transaction.objectStore(STORES.DOCUMENTS);
      const docRequest = documentStore.get(id);
      
      docRequest.onsuccess = () => {
        const doc = docRequest.result;
        if (doc) {
          doc.uploaded = uploaded;
          doc.filePath = filePath;
          documentStore.put(doc);
        }
      };

      // Atualizar metadados
      const metadataStore = transaction.objectStore(STORES.METADATA);
      const metaRequest = metadataStore.get(id);
      
      metaRequest.onsuccess = () => {
        const meta = metaRequest.result;
        if (meta) {
          meta.uploaded = uploaded;
          meta.filePath = filePath;
          metadataStore.put(meta);
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Remover documento
  async removeDocument(id: string): Promise<void> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.DOCUMENTS, STORES.METADATA], 'readwrite');
      
      transaction.objectStore(STORES.DOCUMENTS).delete(id);
      transaction.objectStore(STORES.METADATA).delete(id);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Limpar todos os documentos de um tipo
  async clearDocumentsByType(documentType: string): Promise<void> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.DOCUMENTS, STORES.METADATA], 'readwrite');
      
      // Limpar documentos
      const documentStore = transaction.objectStore(STORES.DOCUMENTS);
      const docIndex = documentStore.index('documentType');
      const docRequest = docIndex.openCursor(IDBKeyRange.only(documentType));
      
      docRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      // Limpar metadados
      const metadataStore = transaction.objectStore(STORES.METADATA);
      const metaIndex = metadataStore.index('documentType');
      const metaRequest = metaIndex.openCursor(IDBKeyRange.only(documentType));
      
      metaRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Converter File para ArrayBuffer
  async fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  // Converter ArrayBuffer para File
  arrayBufferToFile(arrayBuffer: ArrayBuffer, fileName: string, mimeType: string): File {
    return new File([arrayBuffer], fileName, { type: mimeType });
  }
}

// Instância singleton
export const indexedDBManager = new IndexedDBManager();

// Funções auxiliares para facilitar o uso
export const saveDocumentToIndexedDB = async (
  file: File,
  tomadorIndex: number,
  documentType: DocumentData['documentType'],
  tipo?: 'holerite' | 'extrato',
  campoId?: string
): Promise<string> => {
  const id = `${documentType}_${tomadorIndex}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const fileData = await indexedDBManager.fileToArrayBuffer(file);
  
  const documentData: DocumentData = {
    id,
    tomadorIndex,
    documentType,
    fileName: file.name,
    fileData,
    mimeType: file.type,
    uploaded: false,
    tipo,
    campoId,
    createdAt: Date.now()
  };

  await indexedDBManager.saveDocument(documentData);
  return id;
};

export const loadDocumentFromIndexedDB = async (id: string): Promise<File | null> => {
  const documentData = await indexedDBManager.getDocument(id);
  if (!documentData) return null;
  
  return indexedDBManager.arrayBufferToFile(
    documentData.fileData,
    documentData.fileName,
    documentData.mimeType
  );
};
