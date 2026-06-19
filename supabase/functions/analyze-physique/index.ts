import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { imageBase64, imageMediaType, userProfile } = await req.json()

    const prompt = `Tu es un expert en morphologie sportive et en bodybuilding naturel. Analyse cette photo de physique et réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks.

Profil déclaré :
- Niveau : ${userProfile.level}
- Objectif : ${userProfile.goal}
- Âge : ${userProfile.age} ans
- Poids : ${userProfile.weight}kg
- Taille : ${userProfile.height}cm

Analyse la morphologie visible (musculature, proportions, masse musculaire estimée) et retourne exactement ce JSON :
{
  "score": <nombre entre 60 et 97>,
  "athlete": "<prénom nom d'un athlète fitness/bodybuilding naturel réel dont la morphologie est similaire>",
  "athlete_description": "<description courte de l'athlète en 1 phrase>",
  "strengths": ["<point fort 1>", "<point fort 2>"],
  "improvements": ["<axe amélioration 1>", "<axe amélioration 2>"],
  "body_type": "<ectomorphe|mésomorphe|endomorphe>",
  "potential": "<phrase courte sur le potentiel, ex: Excellent potentiel de prise de masse>"
}

Athlètes de référence possibles (naturels reconnus) :
Jeff Nippard, Ryan Terry, Steve Cook, Marc Fitt, Lazar Angelov, Simeon Panda, Ulisses Jr, Chris Bumstead (catégorie classic physique uniquement).

IMPORTANT :
- Score minimum 60 pour ne pas décourager
- Sois encourageant mais réaliste
- Si la photo ne montre pas clairement le physique, base-toi sur le profil déclaré et mets score 75`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') ?? '',
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: imageMediaType ?? 'image/jpeg',
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      }),
    })

    const data = await response.json()
    const content = data.content[0].text

    const cleanContent = content
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim()

    const result = JSON.parse(cleanContent)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(
      JSON.stringify({
        score: 75,
        athlete: 'Jeff Nippard',
        athlete_description: 'Bodybuilder naturel et coach reconnu mondialement',
        strengths: ['Bonne base morphologique', 'Potentiel de progression élevé'],
        improvements: ['Continuer la surcharge progressive', 'Optimiser la récupération'],
        body_type: 'mésomorphe',
        potential: 'Excellent potentiel avec une progression structurée',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
