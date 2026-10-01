#!/usr/bin/env python3
"""Generate static website, LaTeX/PDF CV and LinkedIn copy from profile.yaml."""
import argparse
import html
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys

try:
    import yaml
except ImportError:
    sys.exit('Install the build dependency: python3 -m pip install -r requirements.txt')

ROOT = Path(__file__).resolve().parent.parent
H = lambda value: html.escape(str(value), quote=True)

def tex(value):
    replacements = {'\\': r'\textbackslash{}', '&': r'\&', '%': r'\%', '$': r'\$', '#': r'\#', '_': r'\_', '{': r'\{', '}': r'\}', '~': r'\textasciitilde{}', '^': r'\textasciicircum{}', '–': '--', '—': '---', '’': "'"}
    return ''.join(replacements.get(c, c) for c in str(value))

def fill(template, values):
    def replace(match):
        key = match.group(1)
        if key not in values:
            raise ValueError(f'Unknown template placeholder: {key}')
        return values[key]
    return re.sub(r'\{\{([A-Z_]+)\}\}', replace, template)

def link(label, url, extra=''):
    return f'<a href="{H(url)}"{extra}>{H(label)}</a>'

def section(id, title, body):
    return f'<section id="{id}" class="section">\n    <h2>{title}</h2>\n{body}\n  </section>'

def entry(title, dates, org, desc):
    return f'''    <div class="entry">
      <div class="entry__head"><span class="entry__role">{H(title)}</span><span class="entry__date">{H(dates)}</span></div>
      <div class="entry__org">{H(org)}</div>
      <p class="entry__desc">{H(desc)}</p>
    </div>'''

def generate(p):
    for key in ['name', 'email', 'website', 'links', 'education', 'experience', 'publications', 'research_interests', 'awards']:
        if not p.get(key):
            raise ValueError(f'Missing profile field: {key}')
    # Validate link schemes before embedding links into public HTML or LaTeX.
    urls = [p['website'], *p['links'].values(), *[u for pub in p['publications'] for u in pub['links'].values()]]
    if any(not re.match(r'^https?://[^\s{}\\]+$', u) for u in urls):
        raise ValueError('Profile links must be valid HTTP(S) URLs without spaces or TeX control characters')
    values = {key.upper(): H(p[key]) for key in ['name', 'alternate_name', 'brand', 'initials', 'headline', 'affiliation', 'location', 'email', 'website']}
    values['LINKEDIN'] = H(p['links']['LinkedIn'])
    values['DESCRIPTION'] = H(f"{p['name']} ({p['alternate_name']}) — {p['headline']} at {p['affiliation']}. Research interests: " + ', '.join(p['research_interests']) + '.')
    values['LINKS'] = '\n'.join([link('Email', 'mailto:'+p['email']), *[link(k,v,' rel="me" target="_blank"') for k,v in p['links'].items()], link('CV (PDF)', 'cv.pdf')])
    structured = {'@context':'https://schema.org', '@type':'Person', 'name':p['name'], 'alternateName':p['alternate_name'], 'url':p['website'], 'image':p['website'].rstrip('/')+'/profile.jpg', 'jobTitle':p['headline'], 'alumniOf':{'@type':'CollegeOrUniversity','name':p['affiliation']}, 'worksFor':{'@type':'Organization','name':p['experience'][0]['organization']}, 'knowsAbout':p['research_interests'], 'sameAs':list(p['links'].values())}
    values['STRUCTURED_DATA'] = json.dumps(structured,ensure_ascii=False,indent=2).replace('<', '\\u003c')
    values['RESEARCH'] = section('research','Research Interests','    <ul class="interests">'+''.join(f'<li>{H(i)}</li>' for i in p['research_interests'])+'</ul>')
    pubs=[]
    for pub in p['publications']:
        authors=', '.join(f'<strong>{H(a)}</strong>' if a==p['name'] else H(a) for a in pub['authors'])
        award=f'<span class="pub__award">🏆 {H(pub["award"])}</span>' if pub.get('award') else ''
        links=' · '.join(link(k,v,' target="_blank"') for k,v in pub['links'].items())
        pubs.append(f'<li class="pub"><p class="pub__title">{H(pub["title"])}</p><p class="pub__authors">{authors}</p><p class="pub__venue">{H(pub["venue"])}{award}</p><p class="pub__links">{links}</p></li>')
    values['PUBLICATIONS']=section('publications','Publications','<ol class="pubs">'+ '\n'.join(pubs)+'</ol>')
    jobs=[]
    for job in p['experience']:
        if len(job['roles'])==1:
            r=job['roles'][0]
            jobs.append(entry(r['title'],r['dates'],job['organization']+' · '+job['location'],r.get('description',job.get('description',''))))
        else:
            roles=''.join(f'<li><span class="progression__role">{H(r["title"])}</span><span class="progression__date">{H(r["dates"])}</span>' + (f'<p class="entry__desc">{H(r["description"])}</p>' if r.get('description') else '') + '</li>' for r in job['roles'])
            shared=f'<p class="entry__desc">{H(job["description"])}</p>' if job.get('description') else ''
            jobs.append(f'<div class="entry entry--progression"><div class="entry__head"><span class="entry__role">{H(job["organization"])}</span></div><div class="entry__org">{H(job["location"])}</div><ul class="progression">{roles}</ul>{shared}</div>')
    values['EXPERIENCE']=section('experience','Experience','\n'.join(jobs))
    values['EDUCATION']=section('education','Education','\n'.join(entry(e['degree'],e['dates'],e['organization']+' · '+e['location'],e['description']) for e in p['education'] if e.get('website',True)))
    values['AWARDS']=section('awards','Honors &amp; Awards','<ul class="awards">'+''.join(f'<li>{H(a)}</li>' for a in p['awards'])+'</ul>')
    website=fill((ROOT/'templates/home.html').read_text(), values)
    lines=[r'\begin{center}',r'{\Large\textbf{'+tex(p['name'])+'}}'+r'\\[3pt]',r'\small '+tex(p['location'])+r' $\cdot$ \href{mailto:'+p['email']+'}{'+tex(p['email'])+'}'+r'\\[3pt]']
    cvlinks={'Website':p['website'], **{k:v for k,v in p['links'].items() if k!='Google Scholar'}}
    lines += [' $\\cdot$ '.join(r'\href{'+v+'}{'+tex(k)+'}' for k,v in cvlinks.items()),r'\end{center}']
    def heading(title): lines.extend([r'\section{'+title+'}',r'\resumeSubHeadingListStart'])
    def bullet(text): lines.append(r'\resumeItemTitleless{'+tex(text)+'}')
    heading('Education')
    for e in p['education']:
        lines.append(r'\resumeSubheading{'+tex(e['organization'])+'}{'+tex(e['location'])+'}{'+tex(e['degree'])+'}{'+tex(e['dates'])+'}')
        lines.append(r'\resumeItemListStart');bullet(e['description'])
        for text in e.get('cv_bullets',[]): bullet(text)
        lines.append(r'\resumeItemListEnd')
    lines.append(r'\resumeSubHeadingListEnd')
    heading('Publications')
    for pub in p['publications']:
        url=pub['links'].get('DOI') or pub['links'].get('Article')
        text=', '.join(pub['authors'])+'. '+pub['venue']+'.'
        if pub.get('award'): text+=' '+pub['award']+'.'
        lines.append(r'\resumeItem{'+tex(pub['title'])+'}{'+tex(text)+(r' \href{'+url+'}{Article}.' if url else '')+'}')
    lines.append(r'\resumeSubHeadingListEnd')
    heading('Research Interests');bullet(', '.join(p['research_interests'])+'.');lines.append(r'\resumeSubHeadingListEnd')
    # Keep experience together on page two; academic information occupies page one.
    lines.append(r'\newpage')
    heading('Experience')
    for job in p['experience']:
        for i,r in enumerate(job['roles']):
            if i == 0:
                row = r'\textit{\small ' + tex(r['title']) + r'} & \textit{\small ' + tex(r['dates']) + r'} \\'
                lines.append(r'\resumeEmployer{'+tex(job['organization'])+'}{'+tex(job['location'])+'}{\n'+row+'\n}')
            else:
                lines.append(r'\resumeRole{'+tex(r['title'])+'}{'+tex(r['dates'])+'}')
            if r.get('description'):
                lines.append(r'\resumeItemListStart');bullet(r['description']);lines.append(r'\resumeItemListEnd')
        shared = ([job['description']] if job.get('description') else []) + job.get('cv_bullets',[])
        if shared:
            lines.append(r'\resumeItemListStart')
            for text in shared: bullet(text)
            lines.append(r'\resumeItemListEnd')
    lines.append(r'\resumeSubHeadingListEnd')
    heading('Honors / Awards')
    for award in p['awards']:bullet(award)
    lines.append(r'\resumeSubHeadingListEnd')
    latex=fill((ROOT/'templates/resume.tex').read_text(), {'CONTENT':'\n'.join(lines)})
    linkedin=['LINKEDIN PROFILE COPY — generated from profile.yaml', 'These are proposed values, not an audit of your live LinkedIn profile.', 'After editing profile.yaml, rebuild and apply the changed sections in LinkedIn.', '', 'HEADLINE', p['headline']+' | '+p['affiliation'], '', 'EXPERIENCE']
    for job in p['experience']:
        linkedin.append(job['organization']+' · '+job['location'])
        for r in job['roles']:
            linkedin.append(r['title']+' | '+r['dates'])
            if r.get('description'): linkedin += [r['description'], '']
        if job.get('description'): linkedin.append(job['description'])
        linkedin.append('')
    linkedin += ['EDUCATION']
    for e in p['education']:linkedin += [e['organization'],e['degree']+' | '+e['dates'],e['description'],'']
    linkedin += ['PUBLICATIONS']
    for pub in p['publications']:linkedin += [pub['title'],', '.join(pub['authors']),pub['venue'],*([pub['award']] if pub.get('award') else []), *[k+': '+v for k,v in pub['links'].items()],'']
    linkedin += ['HONORS AND AWARDS',*p['awards'],'','WEBSITE',p['website']]
    return {ROOT/'index.html':website, ROOT/'resume/resume.tex':latex, ROOT/'output/linkedin.txt':'\n'.join(linkedin)+'\n'}

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true',help='Fail if generated text files differ from the profile/templates; do not write or compile')
    parser.add_argument('--no-pdf', action='store_true',help='Generate text outputs without compiling the CV')
    args=parser.parse_args()
    p=yaml.safe_load((ROOT/'profile.yaml').read_text())
    outputs=generate(p)
    if args.check:
        stale=[str(path.relative_to(ROOT)) for path,text in outputs.items() if not path.exists() or path.read_text()!=text]
        if stale:sys.exit('Out-of-date generated files: '+', '.join(stale))
        print('Website, LaTeX and LinkedIn text match profile.yaml.');return
    if not args.no_pdf:
        if not shutil.which('pdflatex'):sys.exit('pdflatex is required to compile the CV. Install a TeX distribution or use --no-pdf.')
        build=ROOT/'tmp/pdfs';build.mkdir(parents=True,exist_ok=True)
        # Compile first so a failed PDF build does not publish partial text outputs.
        (build/'resume.tex').write_text(outputs[ROOT/'resume/resume.tex'])
        for _ in range(2):
            run=subprocess.run(['pdflatex','-no-shell-escape','-interaction=nonstopmode','-halt-on-error','resume.tex'],cwd=build,capture_output=True,text=True)
            if run.returncode:
                sys.exit('LaTeX build failed (see tmp/pdfs/resume.log):\n'+run.stdout[-4000:])
        shutil.copyfile(build/'resume.pdf',ROOT/'cv.pdf')
    for path,text in outputs.items():path.parent.mkdir(parents=True,exist_ok=True);path.write_text(text)
    print('Generated index.html, resume/resume.tex, output/linkedin.txt'+(' and cv.pdf.' if not args.no_pdf else '. PDF was not rebuilt.'))

if __name__=='__main__':main()
