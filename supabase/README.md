# COAI Supabase Backend

A comprehensive backend solution for COAI using Supabase with flexible JSONB-based tables, user authentication, and secure data persistence.

## 🏗️ Architecture Overview

The COAI backend is built around **flexible JSONB storage** to accommodate evolving data structures without constant schema migrations:

- **Users & Profiles** - Supabase Auth + custom profile data
- **Synths** - AI personalities that users create and customize  
- **Teams** - Collections of synths that work together
- **Threads** - Chat conversations between users and AI teams
- **Messages** - Individual messages within conversations

## 📋 Database Schema

All tables use UUID primary keys and JSONB columns for maximum flexibility:

```sql
-- Core tables with coai- prefix
coai-profiles       -- User profile data
coai-synths         -- Custom AI personalities  
coai-teams          -- Collections of synths
coai-team-synths    -- Many-to-many junction table
coai-threads        -- Chat conversations
coai-messages       -- Individual messages
```

## 🔐 Security Features

- **Row Level Security (RLS)** enabled on all tables
- **User isolation** - users can only access their own data
- **Comprehensive policies** for all CRUD operations
- **Supabase Auth integration** with automatic user management

## 📁 File Structure

```
supabase/
├── README.md                    # This file
├── IMPLEMENTATION_PLAN.md       # Detailed implementation guide
├── SETUP_GUIDE.md              # Step-by-step setup instructions
├── migrations/
│   ├── 001_initial_schema.sql   # Database tables, indexes, triggers
│   └── 002_rls_policies.sql     # Row Level Security policies
└── functions/                   # Edge functions (existing AI generation)
```

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install @supabase/supabase-js
   ```

2. **Create Supabase project** at [supabase.com](https://supabase.com)

3. **Run migrations:**
   - Copy SQL from `migrations/` folder
   - Run in Supabase SQL Editor
   - Or use Supabase CLI: `supabase db push`

4. **Configure environment:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

5. **Follow the detailed [SETUP_GUIDE.md](./SETUP_GUIDE.md)**

## 💡 Key Design Decisions

### Why JSONB?
- **Flexibility**: Accommodate changing data structures without migrations
- **Performance**: GIN indexes on JSONB columns for fast queries
- **Simplicity**: Store complex objects directly without normalization

### Why Table Prefixes?
- **Namespace isolation**: `coai-` prefix prevents conflicts
- **Clear ownership**: Easy to identify COAI-specific tables
- **Migration safety**: Avoid accidental operations on system tables

### Why Threads vs Teams?
- **Teams** = Collections of AI synths (reusable)
- **Threads** = Individual conversations (instances)
- **Separation of concerns**: Teams can be used in multiple conversations

## 🔄 Migration from LocalStorage

The current COAI app uses localStorage for persistence. This backend provides:

1. **Data migration hooks** to transfer existing data
2. **Backwards compatibility** during transition
3. **Gradual migration** - can run both systems in parallel

## 📊 Current vs New Architecture

| Aspect | Current (localStorage) | New (Supabase) |
|--------|----------------------|----------------|
| Storage | Browser only | Cloud database |
| Sharing | No | Multi-device sync |
| Backup | Manual export | Automatic |
| Security | Client-side | Server-side RLS |
| Collaboration | No | Future: team sharing |
| Scalability | Limited | Unlimited |

## 🛠️ Development Workflow

1. **Local development** with Supabase local instance
2. **Migrations** in version-controlled SQL files  
3. **Type safety** with generated TypeScript types
4. **Testing** with comprehensive RLS policy validation
5. **Deployment** via Supabase CLI or dashboard

## 📈 Next Steps

1. **Phase 1**: Implement React hooks for database operations
2. **Phase 2**: Replace localStorage with Supabase calls  
3. **Phase 3**: Add real-time subscriptions for live updates
4. **Phase 4**: Advanced features (sharing, collaboration)

## 🔗 Related Documentation

- [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) - Detailed technical plan
- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Step-by-step setup instructions
- [Supabase Documentation](https://supabase.com/docs) - Official docs

## 🤝 Contributing

When adding new features:

1. **Update migrations** in numbered SQL files
2. **Test RLS policies** thoroughly  
3. **Document schema changes** in implementation plan
4. **Consider JSONB structure** for future flexibility

---

**Built with ❤️ for the COAI project** 