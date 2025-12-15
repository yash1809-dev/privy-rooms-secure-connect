# CollegeOS Deployment Guide

## 🚀 Deploying to Vercel

### Prerequisites
- Vercel account
- GitHub repository
- Supabase project

### Environment Variables

Set these in Vercel Dashboard → Settings → Environment Variables:

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Deployment Steps

1. **Connect GitHub to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository

2. **Configure Build Settings:**
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Add Environment Variables:**
   - Add `VITE_SUPABASE_URL`
   - Add `VITE_SUPABASE_ANON_KEY`

4. **Deploy:**
   - Click "Deploy"
   - Wait for build to complete

### Files Verified

✅ `vercel.json` - SPA routing configuration  
✅ `public/upi-qr.jpg` - QR code image  
✅ All components properly imported  
✅ No broken image links  
✅ Build configuration correct  

### Post-Deployment Checklist

- [ ] Test login functionality
- [ ] Verify image loading
- [ ] Test donation dialog
- [ ] Check video calling
- [ ] Verify routing works

### Troubleshooting

**If images don't load:**
- Ensure images are in `public/` folder
- Use paths like `/image.jpg` (not `./image.jpg`)

**If routing breaks:**
- Check `vercel.json` exists
- Verify it has the rewrite rule

**If environment variables fail:**
- Double-check they're set in Vercel dashboard
- Ensure they start with `VITE_`
- Redeploy after adding them

## 🎉 Your Site Will Be Live!

Once deployed, your CollegeOS app will be available at:
`https://your-project-name.vercel.app`
