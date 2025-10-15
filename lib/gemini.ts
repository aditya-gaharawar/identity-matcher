import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

export interface MatchResult {
  matchScore: number;
  confidence: number;
  analysis: string;
  isMatch: boolean;
  matchedProfile?: number;
}

export async function compareImages(
  referenceImageUrl: string,
  userImageUrl: string,
  expectedProfiles: number[]
): Promise<MatchResult> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = `
    You are a facial recognition expert. Compare these two images and determine if they match.
    
    Reference Image: ${referenceImageUrl}
    User Image: ${userImageUrl}
    
    Expected Profiles: ${expectedProfiles.join(', ')}
    
    Please provide:
    1. Match score (0-100)
    2. Confidence level (0-100)
    3. Detailed analysis
    4. Whether it's a match (true/false)
    5. Which profile ID it matches (if any)
    
    Response format: JSON
    {
      "matchScore": number,
      "confidence": number,
      "analysis": "string",
      "isMatch": boolean,
      "matchedProfile": number | null
    }
    `;

    const result = await model.generateContent([prompt]);
    const response = result.response;
    const text = response.text();
    
    // Parse the JSON response
    const parsed = JSON.parse(text);
    
    return {
      matchScore: parsed.matchScore || 0,
      confidence: parsed.confidence || 0,
      analysis: parsed.analysis || '',
      isMatch: parsed.isMatch || false,
      matchedProfile: parsed.matchedProfile || undefined
    };

  } catch (error) {
    console.error('Error comparing images:', error);
    return {
      matchScore: 0,
      confidence: 0,
      analysis: 'Failed to analyze images - Gemini API error',
      isMatch: false
    };
  }
}

export async function getBestMatch(
  userImageUrl: string,
  referenceImages: Array<{ url: string; profileId: number }>
): Promise<MatchResult> {
  const matchPromises = referenceImages.map(async (ref) => {
    const result = await compareImages(ref.url, userImageUrl, [ref.profileId]);
    return {
      ...result,
      matchedProfile: ref.profileId
    };
  });

  const matches = await Promise.all(matchPromises);
  
  // Find the best match based on both match score and confidence
  const bestMatch = matches.reduce((best, current) => {
    const currentScore = current.matchScore * (current.confidence / 100);
    const bestScore = best.matchScore * (best.confidence / 100);
    
    return currentScore > bestScore ? current : best;
  });

  return bestMatch;
}
