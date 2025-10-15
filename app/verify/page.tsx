"use client";
import Link from "next/link";
import Image from "next/image";
import Footer from "@/components/Footer";
import { WalletConnect } from "@/components/walletConnect";
import { useAccount, useSwitchChain, useChainId } from "wagmi";
import { filecoinCalibration } from "wagmi/chains";
import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { IDENTITY_CONTRACT_ABI, IDENTITY_CONTRACT_ADDRESS } from "@/lib/contract";
import { useEthersProvider, useEthersSigner } from "@/hooks/useEthers";
import { supabase, ReferenceImage } from "@/lib/supabase";
import { getBestMatch } from "@/lib/gemini";
import { hashUrl } from "@/lib/crypto";


interface VerificationResult {
   matchScore: number;
   confidence: number;
   analysis: string;
   isMatch: boolean;
   matchedProfile?: number;
   CID?: string;
}

export default function VerifyIdentity() {
    const { isConnected, address } = useAccount();
    const connectedChainId = useChainId();
    const { switchChain, isPending: isSwitching } = useSwitchChain();
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadedFile, setUploadedFile] = useState<{data: {Hash: string}} | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [verifyError, setVerifyError] = useState<string | null>(null);
    const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
    const [isRegistering, setIsRegistering] = useState(false);
    const [registerError, setRegisterError] = useState<string | null>(null);
    const [registerSuccess, setRegisterSuccess] = useState(false);
    const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);

    const isMatching = connectedChainId === filecoinCalibration.id;
    const signer = useEthersSigner();
    const LIGHTHOUSE_API_KEY = process.env.NEXT_PUBLIC_LIGHTHOUSE_API_KEY;

    // Load reference images on mount
    useEffect(() => {
        loadReferenceImages();
    }, []);

    const loadReferenceImages = async () => {
        try {
            const { data, error } = await supabase
                .from('reference_images')
                .select('*')
                .order('profile_id', { ascending: true });
            
            if (error) throw error;
            setReferenceImages(data || []);
        } catch (error) {
            console.error('Error loading reference images:', error);
        }
    };

    // Switch to Filecoin Calibration
    useEffect(() => {
        if (isConnected && !isMatching) {
            switchChain({ chainId: filecoinCalibration.id });
        }
    }, [isConnected, isMatching, switchChain]);

    const progressCallback = (progressData: any) => {
        try {
            const pct = 100 - Number(((progressData?.total / progressData?.uploaded) as number).toFixed(2));
            if (!Number.isNaN(pct)) setUploadProgress(pct);
        } catch {}
    };

    const onUploadChange = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        if (!LIGHTHOUSE_API_KEY) {
            setUploadError("Lighthouse API key not configured");
            return;
        }

        setIsUploading(true);
        setUploadError(null);
        setUploadProgress(0);
        setVerificationResult(null);

        try {
            const { default: lighthouse } = await import("@lighthouse-web3/sdk");
            const output = await lighthouse.upload(
                [files[0]], // Only upload one file for verification
                LIGHTHOUSE_API_KEY,
                undefined,
                progressCallback
            );

            const cid = output?.data?.Hash as string | undefined;
            if (!cid) throw new Error("Upload failed: no CID returned");

            setUploadedFile(output);
            setUploadProgress(100);

            // Automatically start verification after upload
            await performVerification(cid);
        } catch (e) {
            setUploadError(e instanceof Error ? e.message : "Upload failed");
        } finally {
            setIsUploading(false);
        }
    };

    const performVerification = async (cid: string) => {
        if (referenceImages.length === 0) {
            setVerifyError("No reference images available for comparison");
            return;
        }

        setIsVerifying(true);
        setVerifyError(null);

        try {
            const userImageUrl = `https://gateway.lighthouse.storage/ipfs/${cid}`;
            
            // Prepare reference images for comparison
            const comparisonImages = referenceImages.map(img => ({
                url: img.image_url,
                profileId: img.profile_id
            }));

            // Get best match using Gemini AI
            const matchResult = await getBestMatch(userImageUrl, comparisonImages);

            const result: VerificationResult = {
                ...matchResult,
                CID: cid
            };

            setVerificationResult(result);

            // Store the verification attempt in Supabase
            const { error } = await supabase
                .from('identity_records')
                .insert({
                    user_address: address!,
                    profile_id: result.matchedProfile || 0,
                    hashed_url: hashUrl(userImageUrl),
                    ipfs_cid: cid,
                    match_score: result.matchScore,
                    verification_status: result.isMatch ? 'verified' : 'rejected'
                });

            if (error) console.error('Error storing verification record:', error);

        } catch (e) {
            setVerifyError(e instanceof Error ? e.message : "Verification failed");
        } finally {
            setIsVerifying(false);
        }
    };

    const handleRegisterIdentity = useCallback(async () => {
        if (!isConnected || !isMatching || !verificationResult || !verificationResult.matchedProfile) return;

        try {
            setIsRegistering(true);
            setRegisterError(null);
            setRegisterSuccess(false);

            if (!signer) {
                throw new Error("Please connect your wallet");
            }

            const contract = new ethers.Contract(
                IDENTITY_CONTRACT_ADDRESS,
                IDENTITY_CONTRACT_ABI as ethers.InterfaceAbi,
                signer
            );

            const imageUrl = `https://gateway.lighthouse.storage/ipfs/${verificationResult.CID}`;
            
            const tx = await contract.registerIdentity(
                verificationResult.matchedProfile,
                hashUrl(imageUrl),
                verificationResult.CID!,
                Math.round(verificationResult.matchScore)
            );

            await tx.wait();
            setRegisterSuccess(true);
        } catch (e) {
            const err = e as unknown as { reason?: string; shortMessage?: string; message?: string };
            const reason = err?.reason || err?.shortMessage || err?.message || "Registration failed";
            setRegisterError(reason);
        } finally {
            setIsRegistering(false);
        }
    }, [isConnected, isMatching, signer, verificationResult]);

    const resetVerification = () => {
        setUploadedFile(null);
        setVerificationResult(null);
        setRegisterSuccess(false);
        setUploadProgress(0);
    };

    return (
        <div className="min-h-screen bg-white-pattern">
            <section className="min-h-screen flex flex-col justify-between pb-10 md:pb-20">
                <div className="flex justify-between items-center pt-20 md:pt-32 container mx-auto px-4 md:px-16">
                    <Link href="/">
                        <Image
                            className="cursor-pointer"
                            src="https://code.webspaceai.in/lovable-uploads/b5556be9-1da8-4fdb-a6b9-969b73491798.png"
                            width={150}
                            height={150}
                            alt="Identity Matcher Logo"
                        />
                    </Link>
                    <div className="flex items-center">
                        {!isConnected ? (
                            <WalletConnect />
                        ) : (
                            <div className="flex items-center space-x-2">
                                <span className="font-funnel-display text-xl text-gray-600">
                                    User: {address?.slice(0, 6)}...{address?.slice(-4)} 👋
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {isConnected && (
                    <div className="flex-1 container mx-auto px-4 md:px-16">
                        <div className="space-y-8">
                            {/* Header */}
                            <div>
                                <h1 className="font-funnel-display text-3xl font-bold text-black mb-4">
                                    Identity Verification
                                </h1>
                                <p className="font-funnel-display text-lg text-gray-600">
                                    Upload your photo to verify your identity against reference images
                                </p>
                            </div>

                            {isConnected && !isMatching && (
                                <div className="w-full max-w-md p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-yellow-800 font-funnel-display">
                                            Please switch to Filecoin Calibration network
                                        </p>
                                        <button
                                            onClick={() => switchChain({ chainId: filecoinCalibration.id })}
                                            disabled={isSwitching}
                                            className={`ml-3 px-3 py-1.5 rounded-md text-sm font-funnel-display font-semibold transition-colors ${
                                                isSwitching ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-yellow-600 text-white hover:bg-yellow-700'
                                            }`}
                                        >
                                            {isSwitching ? 'Switching...' : 'Switch Network'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Upload Section */}
                            <div className="max-w-2xl mx-auto">
                                {!uploadedFile ? (
                                    <div className="relative">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            id="file-upload"
                                            onChange={(e) => onUploadChange(e.target.files)}
                                            disabled={isUploading || isVerifying}
                                        />
                                        <label
                                            htmlFor="file-upload"
                                            className={`flex flex-col items-center justify-center w-full h-96 border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
                                                isUploading || isVerifying
                                                    ? 'border-blue-400 bg-blue-50' 
                                                    : 'border-gray-300 bg-white hover:border-gray-400'
                                            }`}
                                        >
                                            <div className="flex flex-col items-center space-y-3">
                                                {(isUploading || isVerifying) ? (
                                                    <div className="flex flex-col items-center space-y-2">
                                                        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                                                        <p className="text-sm text-blue-600 font-funnel-display">
                                                            {isUploading ? `Uploading... ${uploadProgress.toFixed(0)}%` : 'Verifying...'}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <svg
                                                            className="w-12 h-12 text-gray-400"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={1.5}
                                                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                                            />
                                                        </svg>
                                                        <div className="text-center">
                                                            <p className="text-lg font-semibold text-gray-700 font-funnel-display">
                                                                Upload your verification photo
                                                            </p>
                                                            <p className="text-sm text-gray-500 font-funnel-display">
                                                                Drag and drop or click to browse
                                                            </p>
                                                            <p className="text-xs text-gray-400 font-funnel-display mt-1">
                                                                PNG, JPG up to 10MB
                                                            </p>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </label>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* Uploaded Image Preview */}
                                        <div className="space-y-4">
                                            <h3 className="font-funnel-display text-lg font-medium">Uploaded Image:</h3>
                                            <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
                                                <Image
                                                    src={`https://gateway.lighthouse.storage/ipfs/${uploadedFile.data.Hash}`}
                                                    alt="Uploaded verification image"
                                                    width={400}
                                                    height={400}
                                                    className="w-full h-auto max-h-96 object-contain"
                                                />
                                            </div>
                                        </div>

                                        {/* Verification Result */}
                                        {verificationResult && (
                                            <div className={`p-4 rounded-lg border ${
                                                verificationResult.isMatch 
                                                    ? 'bg-green-50 border-green-200' 
                                                    : 'bg-red-50 border-red-200'
                                            }`}>
                                                <h3 className="font-funnel-display text-lg font-medium mb-3">
                                                    Verification Result: {verificationResult.isMatch ? '✅ Verified' : '❌ Not Matched'}
                                                </h3>
                                                <div className="space-y-2">
                                                    {verificationResult.matchedProfile && (
                                                        <p className="text-sm">
                                                            <span className="font-medium">Matched Profile:</span> {verificationResult.matchedProfile}
                                                        </p>
                                                    )}
                                                    <p className="text-sm">
                                                        <span className="font-medium">Match Score:</span> {verificationResult.matchScore.toFixed(1)}%
                                                    </p>
                                                    <p className="text-sm">
                                                        <span className="font-medium">Confidence:</span> {verificationResult.confidence.toFixed(1)}%
                                                    </p>
                                                    <p className="text-sm">
                                                        <span className="font-medium">Analysis:</span> {verificationResult.analysis}
                                                    </p>
                                                </div>

                                                {verificationResult.isMatch && !registerSuccess && (
                                                    <button
                                                        onClick={handleRegisterIdentity}
                                                        disabled={isRegistering}
                                                        className={`mt-4 w-full px-4 py-2 rounded-lg font-funnel-display font-semibold transition-colors ${
                                                            isRegistering
                                                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                                : 'bg-blue-600 text-white hover:bg-blue-700'
                                                        }`}
                                                    >
                                                        {isRegistering ? 'Registering...' : 'Register on Blockchain'}
                                                    </button>
                                                )}

                                                {registerError && (
                                                    <p className="text-sm text-red-600 font-funnel-display mt-2">
                                                        {registerError}
                                                    </p>
                                                )}

                                                {registerSuccess && (
                                                    <div className="mt-3 p-3 bg-green-100 rounded-lg">
                                                        <p className="text-sm text-green-800 font-funnel-display">
                                                            ✅ Identity successfully registered on blockchain!
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Reset Button */}
                                        <button
                                            onClick={resetVerification}
                                            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg font-funnel-display font-semibold hover:bg-gray-700 transition-colors"
                                        >
                                            Upload New Image
                                        </button>
                                    </div>
                                )}

                                {uploadError && (
                                    <p className="text-sm text-red-600 font-funnel-display mt-4">
                                        {uploadError}
                                    </p>
                                )}

                                {verifyError && (
                                    <p className="text-sm text-red-600 font-funnel-display mt-4">
                                        {verifyError}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </section>

            <Footer />
        </div>
    );
}
