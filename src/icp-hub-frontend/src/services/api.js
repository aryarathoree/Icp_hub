import { Actor, HttpAgent } from '@dfinity/agent'
import { AuthClient } from '@dfinity/auth-client'
import { Principal } from '@dfinity/principal'

// Backend canister ID (you'll need to replace this with your actual canister ID)
const BACKEND_CANISTER_ID = process.env.VITE_BACKEND_CANISTER_ID || 'rrkah-fqaaa-aaaaa-aaaaq-cai'

// IDL Interface for the backend canister
const idlFactory = ({ IDL }) => {
  // Define all the types from the backend
  const Error = IDL.Variant({
    'NotFound': IDL.Text,
    'Unauthorized': IDL.Text,
    'BadRequest': IDL.Text,
    'InternalError': IDL.Text,
    'Conflict': IDL.Text,
    'Forbidden': IDL.Text,
  })

  const UserProfile = IDL.Record({
    'displayName': IDL.Opt(IDL.Text),
    'bio': IDL.Opt(IDL.Text),
    'avatar': IDL.Opt(IDL.Text),
    'location': IDL.Opt(IDL.Text),
    'website': IDL.Opt(IDL.Text),
    'socialLinks': IDL.Record({
      'twitter': IDL.Opt(IDL.Text),
      'github': IDL.Opt(IDL.Text),
      'linkedin': IDL.Opt(IDL.Text),
    }),
  })

  const User = IDL.Record({
    'principal': IDL.Principal,
    'username': IDL.Text,
    'email': IDL.Opt(IDL.Text),
    'profile': UserProfile,
    'repositories': IDL.Vec(IDL.Text),
    'createdAt': IDL.Int,
    'updatedAt': IDL.Int,
  })

  const RepositoryVisibility = IDL.Variant({
    'Public': IDL.Null,
    'Private': IDL.Null,
    'Internal': IDL.Null,
  })

  const RepositorySettings = IDL.Record({
    'defaultBranch': IDL.Text,
    'allowForking': IDL.Bool,
    'allowIssues': IDL.Bool,
    'allowWiki': IDL.Bool,
    'allowProjects': IDL.Bool,
    'visibility': RepositoryVisibility,
    'license': IDL.Opt(IDL.Text),
    'topics': IDL.Vec(IDL.Text),
  })

  const CollaboratorPermission = IDL.Variant({
    'Read': IDL.Null,
    'Write': IDL.Null,
    'Admin': IDL.Null,
    'Owner': IDL.Null,
  })

  const Collaborator = IDL.Record({
    'principal': IDL.Principal,
    'permission': CollaboratorPermission,
    'addedAt': IDL.Int,
    'addedBy': IDL.Principal,
  })

  const FileEntry = IDL.Record({
    'path': IDL.Text,
    'content': IDL.Vec(IDL.Nat8),
    'size': IDL.Nat,
    'hash': IDL.Text,
    'version': IDL.Nat,
    'lastModified': IDL.Int,
    'author': IDL.Principal,
    'commitMessage': IDL.Opt(IDL.Text),
  })

  const Commit = IDL.Record({
    'id': IDL.Text,
    'message': IDL.Text,
    'author': IDL.Principal,
    'timestamp': IDL.Int,
    'parentCommits': IDL.Vec(IDL.Text),
    'changedFiles': IDL.Vec(IDL.Text),
    'hash': IDL.Text,
  })

  const Branch = IDL.Record({
    'name': IDL.Text,
    'commitId': IDL.Text,
    'isDefault': IDL.Bool,
    'createdAt': IDL.Int,
    'createdBy': IDL.Principal,
  })

  const SerializableRepository = IDL.Record({
    'id': IDL.Text,
    'name': IDL.Text,
    'description': IDL.Opt(IDL.Text),
    'owner': IDL.Principal,
    'collaborators': IDL.Vec(Collaborator),
    'isPrivate': IDL.Bool,
    'settings': RepositorySettings,
    'createdAt': IDL.Int,
    'updatedAt': IDL.Int,
    'files': IDL.Vec(IDL.Tuple(IDL.Text, FileEntry)),
    'commits': IDL.Vec(Commit),
    'branches': IDL.Vec(Branch),
    'stars': IDL.Nat,
    'forks': IDL.Nat,
    'language': IDL.Opt(IDL.Text),
    'size': IDL.Nat,
  })

  const Result = (ok, err) => IDL.Variant({
    'Ok': ok,
    'Err': err,
  })

  const RegisterUserRequest = IDL.Record({
    'username': IDL.Text,
    'email': IDL.Opt(IDL.Text),
    'profile': UserProfile,
  })

  const UpdateUserProfileRequest = IDL.Record({
    'displayName': IDL.Opt(IDL.Text),
    'bio': IDL.Opt(IDL.Text),
    'avatar': IDL.Opt(IDL.Text),
    'location': IDL.Opt(IDL.Text),
    'website': IDL.Opt(IDL.Text),
  })

  const CreateRepositoryRequest = IDL.Record({
    'name': IDL.Text,
    'description': IDL.Opt(IDL.Text),
    'isPrivate': IDL.Bool,
    'initializeWithReadme': IDL.Bool,
    'license': IDL.Opt(IDL.Text),
    'gitignoreTemplate': IDL.Opt(IDL.Text),
  })

  const UpdateRepositoryRequest = IDL.Record({
    'description': IDL.Opt(IDL.Text),
    'settings': IDL.Opt(RepositorySettings),
  })

  const UploadFileRequest = IDL.Record({
    'repositoryId': IDL.Text,
    'path': IDL.Text,
    'content': IDL.Vec(IDL.Nat8),
    'commitMessage': IDL.Text,
    'branch': IDL.Opt(IDL.Text),
  })

  const PaginationParams = IDL.Record({
    'page': IDL.Nat,
    'limit': IDL.Nat,
  })

  const RepositoryListResponse = IDL.Record({
    'repositories': IDL.Vec(SerializableRepository),
    'totalCount': IDL.Nat,
    'hasMore': IDL.Bool,
  })

  const FileListResponse = IDL.Record({
    'files': IDL.Vec(FileEntry),
    'totalCount': IDL.Nat,
    'path': IDL.Text,
  })

  const SearchScope = IDL.Variant({
    'All': IDL.Null,
    'Repositories': IDL.Null,
    'Users': IDL.Null,
    'Files': IDL.Null,
    'Code': IDL.Null,
  })

  const SearchSortBy = IDL.Variant({
    'Relevance': IDL.Null,
    'Name': IDL.Null,
    'CreatedAt': IDL.Null,
    'UpdatedAt': IDL.Null,
    'Stars': IDL.Null,
    'Size': IDL.Null,
  })

  const SearchFilter = IDL.Record({
    'owner': IDL.Opt(IDL.Principal),
    'language': IDL.Opt(IDL.Text),
    'isPrivate': IDL.Opt(IDL.Bool),
    'hasFiles': IDL.Opt(IDL.Bool),
    'minSize': IDL.Opt(IDL.Nat),
    'maxSize': IDL.Opt(IDL.Nat),
    'createdAfter': IDL.Opt(IDL.Int),
    'createdBefore': IDL.Opt(IDL.Int),
  })

  const SearchRequest = IDL.Record({
    'searchQuery': IDL.Text,
    'scope': SearchScope,
    'filters': IDL.Opt(SearchFilter),
    'sortBy': IDL.Opt(SearchSortBy),
    'pagination': IDL.Opt(PaginationParams),
  })

  const UserSearchResult = IDL.Record({
    'user': User,
    'score': IDL.Float64,
    'matchedFields': IDL.Vec(IDL.Text),
  })

  const SerializableRepositorySearchResult = IDL.Record({
    'repository': SerializableRepository,
    'score': IDL.Float64,
    'matchedFields': IDL.Vec(IDL.Text),
  })

  const SerializableFileSearchResult = IDL.Record({
    'file': FileEntry,
    'repository': SerializableRepository,
    'score': IDL.Float64,
    'matchedFields': IDL.Vec(IDL.Text),
    'snippets': IDL.Vec(IDL.Text),
  })

  const SerializableSearchResults = IDL.Record({
    'repositories': IDL.Vec(SerializableRepositorySearchResult),
    'users': IDL.Vec(UserSearchResult),
    'files': IDL.Vec(SerializableFileSearchResult),
    'totalCount': IDL.Nat,
    'hasMore': IDL.Bool,
    'searchQuery': IDL.Text,
    'scope': SearchScope,
  })

  return IDL.Service({
    // User Management
    'registerUser': IDL.Func([RegisterUserRequest], [Result(User, Error)], []),
    'getUser': IDL.Func([IDL.Principal], [Result(User, Error)], ['query']),
    'updateUser': IDL.Func([UpdateUserProfileRequest], [Result(User, Error)], []),

    // Repository Management
    'createRepository': IDL.Func([CreateRepositoryRequest], [Result(SerializableRepository, Error)], []),
    'getRepository': IDL.Func([IDL.Text], [Result(SerializableRepository, Error)], ['query']),
    'listRepositories': IDL.Func([IDL.Principal, IDL.Opt(PaginationParams)], [Result(RepositoryListResponse, Error)], ['query']),
    'updateRepository': IDL.Func([IDL.Text, UpdateRepositoryRequest], [Result(SerializableRepository, Error)], []),
    'deleteRepository': IDL.Func([IDL.Text], [Result(IDL.Bool, Error)], []),

    // File Management
    'uploadFile': IDL.Func([UploadFileRequest], [Result(FileEntry, Error)], []),
    'getFile': IDL.Func([IDL.Text, IDL.Text], [Result(FileEntry, Error)], ['query']),
    'listFiles': IDL.Func([IDL.Text, IDL.Opt(IDL.Text)], [Result(FileListResponse, Error)], ['query']),
    'deleteFile': IDL.Func([IDL.Text, IDL.Text], [Result(IDL.Bool, Error)], []),

    // Search
    'search': IDL.Func([SearchRequest], [Result(SerializableSearchResults, Error)], []),
    'searchSuggestions': IDL.Func([IDL.Text, IDL.Opt(IDL.Nat)], [Result(IDL.Vec(IDL.Text), Error)], ['query']),
    'searchRepository': IDL.Func([IDL.Text, IDL.Text, IDL.Opt(PaginationParams)], [Result(FileListResponse, Error)], []),

    // System
    'health': IDL.Func([], [IDL.Bool], ['query']),
  })
}

// API Service Class
class ApiService {
  constructor() {
    this.authClient = null
    this.actor = null
    this.isAuthenticated = false
    this.currentUser = null
    this.agent = null
  }

  // Initialize the service
  async init() {
    try {
      this.authClient = await AuthClient.create()
      this.isAuthenticated = await this.authClient.isAuthenticated()
      
      if (this.isAuthenticated) {
        await this.setupActor()
        await this.getCurrentUser()
      } else {
        // Create anonymous actor for public operations
        await this.setupAnonymousActor()
      }
      
      return true
    } catch (error) {
      console.error('Failed to initialize API service:', error)
      return false
    }
  }

  // Setup authenticated actor
  async setupActor() {
    const identity = this.authClient.getIdentity()
    this.agent = new HttpAgent({
      identity,
      host: process.env.VITE_DFX_NETWORK === 'local' ? 'http://localhost:4943' : 'https://ic0.app',
    })

    // Fetch root key for certificate validation in development
    if (process.env.VITE_DFX_NETWORK === 'local') {
      await this.agent.fetchRootKey()
    }

    this.actor = Actor.createActor(idlFactory, {
      agent: this.agent,
      canisterId: BACKEND_CANISTER_ID,
    })
  }

  // Setup anonymous actor for public operations
  async setupAnonymousActor() {
    this.agent = new HttpAgent({
      host: process.env.VITE_DFX_NETWORK === 'local' ? 'http://localhost:4943' : 'https://ic0.app',
    })

    if (process.env.VITE_DFX_NETWORK === 'local') {
      await this.agent.fetchRootKey()
    }

    this.actor = Actor.createActor(idlFactory, {
      agent: this.agent,
      canisterId: BACKEND_CANISTER_ID,
    })
  }

  // Authentication Methods
  async login() {
    try {
      await this.authClient.login({
        identityProvider: process.env.VITE_DFX_NETWORK === 'local' 
          ? `http://localhost:4943/?canisterId=${process.env.VITE_INTERNET_IDENTITY_CANISTER_ID}`
          : 'https://identity.ic0.app',
        onSuccess: async () => {
          this.isAuthenticated = true
          await this.setupActor()
          await this.getCurrentUser()
        },
      })
      return true
    } catch (error) {
      console.error('Login failed:', error)
      return false
    }
  }

  async logout() {
    try {
      await this.authClient.logout()
      this.isAuthenticated = false
      this.currentUser = null
      await this.setupAnonymousActor()
      return true
    } catch (error) {
      console.error('Logout failed:', error)
      return false
    }
  }

  getPrincipal() {
    if (!this.isAuthenticated) return null
    return this.authClient.getIdentity().getPrincipal()
  }

  // User Management Methods
  async getCurrentUser() {
    if (!this.isAuthenticated) return null
    
    try {
      const principal = this.getPrincipal()
      const result = await this.actor.getUser(principal)
      
      if ('Ok' in result) {
        this.currentUser = result.Ok
        return this.currentUser
      } else {
        console.log('User not found, needs registration')
        return null
      }
    } catch (error) {
      console.error('Failed to get current user:', error)
      return null
    }
  }

  async registerUser(userData) {
    if (!this.isAuthenticated) throw new Error('Must be authenticated to register')
    
    try {
      const result = await this.actor.registerUser(userData)
      
      if ('Ok' in result) {
        this.currentUser = result.Ok
        return { success: true, data: result.Ok }
      } else {
        return { success: false, error: result.Err }
      }
    } catch (error) {
      console.error('Registration failed:', error)
      return { success: false, error: { InternalError: error.message } }
    }
  }

  async updateUserProfile(profileData) {
    if (!this.isAuthenticated) throw new Error('Must be authenticated to update profile')
    
    try {
      const result = await this.actor.updateUser(profileData)
      
      if ('Ok' in result) {
        this.currentUser = result.Ok
        return { success: true, data: result.Ok }
      } else {
        return { success: false, error: result.Err }
      }
    } catch (error) {
      console.error('Profile update failed:', error)
      return { success: false, error: { InternalError: error.message } }
    }
  }

  async getUser(principal) {
    try {
      const result = await this.actor.getUser(principal)
      
      if ('Ok' in result) {
        return { success: true, data: result.Ok }
      } else {
        return { success: false, error: result.Err }
      }
    } catch (error) {
      console.error('Failed to get user:', error)
      return { success: false, error: { InternalError: error.message } }
    }
  }

  // Repository Management Methods
  async createRepository(repoData) {
    if (!this.isAuthenticated) throw new Error('Must be authenticated to create repository')
    
    try {
      const result = await this.actor.createRepository(repoData)
      
      if ('Ok' in result) {
        return { success: true, data: result.Ok }
      } else {
        return { success: false, error: result.Err }
      }
    } catch (error) {
      console.error('Repository creation failed:', error)
      return { success: false, error: { InternalError: error.message } }
    }
  }

  async getRepository(repositoryId) {
    try {
      const result = await this.actor.getRepository(repositoryId)
      
      if ('Ok' in result) {
        return { success: true, data: result.Ok }
      } else {
        return { success: false, error: result.Err }
      }
    } catch (error) {
      console.error('Failed to get repository:', error)
      return { success: false, error: { InternalError: error.message } }
    }
  }

  async listRepositories(owner, pagination = null) {
    try {
      const ownerPrincipal = typeof owner === 'string' ? Principal.fromText(owner) : owner
      const result = await this.actor.listRepositories(ownerPrincipal, pagination ? [pagination] : [])
      
      if ('Ok' in result) {
        return { success: true, data: result.Ok }
      } else {
        return { success: false, error: result.Err }
      }
    } catch (error) {
      console.error('Failed to list repositories:', error)
      return { success: false, error: { InternalError: error.message } }
    }
  }

  async updateRepository(repositoryId, updateData) {
    if (!this.isAuthenticated) throw new Error('Must be authenticated to update repository')
    
    try {
      const result = await this.actor.updateRepository(repositoryId, updateData)
      
      if ('Ok' in result) {
        return { success: true, data: result.Ok }
      } else {
        return { success: false, error: result.Err }
      }
    } catch (error) {
      console.error('Repository update failed:', error)
      return { success: false, error: { InternalError: error.message } }
    }
  }

  async deleteRepository(repositoryId) {
    if (!this.isAuthenticated) throw new Error('Must be authenticated to delete repository')
    
    try {
      const result = await this.actor.deleteRepository(repositoryId)
      
      if ('Ok' in result) {
        return { success: true, data: result.Ok }
      } else {
        return { success: false, error: result.Err }
      }
    } catch (error) {
      console.error('Repository deletion failed:', error)
      return { success: false, error: { InternalError: error.message } }
    }
  }

  // File Management Methods
  async uploadFile(fileData) {
    if (!this.isAuthenticated) throw new Error('Must be authenticated to upload files')
    
    try {
      const result = await this.actor.uploadFile(fileData)
      
      if ('Ok' in result) {
        return { success: true, data: result.Ok }
      } else {
        return { success: false, error: result.Err }
      }
    } catch (error) {
      console.error('File upload failed:', error)
      return { success: false, error: { InternalError: error.message } }
    }
  }

  async getFile(repositoryId, path) {
    try {
      const result = await this.actor.getFile(repositoryId, path)
      
      if ('Ok' in result) {
        return { success: true, data: result.Ok }
      } else {
        return { success: false, error: result.Err }
      }
    } catch (error) {
      console.error('Failed to get file:', error)
      return { success: false, error: { InternalError: error.message } }
    }
  }

  async listFiles(repositoryId, path = null) {
    try {
      const result = await this.actor.listFiles(repositoryId, path ? [path] : [])
      
      if ('Ok' in result) {
        return { success: true, data: result.Ok }
      } else {
        return { success: false, error: result.Err }
      }
    } catch (error) {
      console.error('Failed to list files:', error)
      return { success: false, error: { InternalError: error.message } }
    }
  }

  async deleteFile(repositoryId, path) {
    if (!this.isAuthenticated) throw new Error('Must be authenticated to delete files')
    
    try {
      const result = await this.actor.deleteFile(repositoryId, path)
      
      if ('Ok' in result) {
        return { success: true, data: result.Ok }
      } else {
        return { success: false, error: result.Err }
      }
    } catch (error) {
      console.error('File deletion failed:', error)
      return { success: false, error: { InternalError: error.message } }
    }
  }

  // Search Methods
  async search(searchRequest) {
    try {
      const result = await this.actor.search(searchRequest)
      
      if ('Ok' in result) {
        return { success: true, data: result.Ok }
      } else {
        return { success: false, error: result.Err }
      }
    } catch (error) {
      console.error('Search failed:', error)
      return { success: false, error: { InternalError: error.message } }
    }
  }

  async searchSuggestions(query, maxSuggestions = null) {
    try {
      const result = await this.actor.searchSuggestions(query, maxSuggestions ? [maxSuggestions] : [])
      
      if ('Ok' in result) {
        return { success: true, data: result.Ok }
      } else {
        return { success: false, error: result.Err }
      }
    } catch (error) {
      console.error('Search suggestions failed:', error)
      return { success: false, error: { InternalError: error.message } }
    }
  }

  async searchRepository(repositoryId, query, pagination = null) {
    try {
      const result = await this.actor.searchRepository(repositoryId, query, pagination ? [pagination] : [])
      
      if ('Ok' in result) {
        return { success: true, data: result.Ok }
      } else {
        return { success: false, error: result.Err }
      }
    } catch (error) {
      console.error('Repository search failed:', error)
      return { success: false, error: { InternalError: error.message } }
    }
  }

  // Utility Methods
  async health() {
    try {
      if (!this.actor) await this.setupAnonymousActor()
      return await this.actor.health();
    } catch (error) {
      return false;
    }
  }

  // Convert file content to/from Uint8Array
  fileToUint8Array(file) {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const arrayBuffer = e.target.result
        const uint8Array = new Uint8Array(arrayBuffer)
        resolve(Array.from(uint8Array))
      }
      reader.readAsArrayBuffer(file)
    })
  }

  uint8ArrayToString(uint8Array) {
    return new TextDecoder().decode(new Uint8Array(uint8Array))
  }

  stringToUint8Array(str) {
    return Array.from(new TextEncoder().encode(str))
  }

  // Format timestamp for display
  formatTimestamp(timestamp) {
    return new Date(Number(timestamp) / 1000000).toLocaleString()
  }

  // Format file size
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Error handling helper
  getErrorMessage(error) {
    if (typeof error === 'string') return error
    
    if (error.NotFound) return `Not found: ${error.NotFound}`
    if (error.Unauthorized) return `Unauthorized: ${error.Unauthorized}`
    if (error.BadRequest) return `Bad request: ${error.BadRequest}`
    if (error.InternalError) return `Internal error: ${error.InternalError}`
    if (error.Conflict) return `Conflict: ${error.Conflict}`
    if (error.Forbidden) return `Forbidden: ${error.Forbidden}`
    
    return 'Unknown error occurred'
  }
}

// Create and export a singleton instance
const apiService = new ApiService()

export default apiService 