import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, Percent } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/header";
import { AuthProvider } from "@/components/auth-provider";
import { Progress } from "@/components/ui/progress";

interface ScoreDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ScoreDetailsPage({
  params,
}: ScoreDetailsPageProps) {
  const { id } = await params;
  const absoluteUrl = `${
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"
  }/api/jobs/${id}`;

  const res = await fetch(absoluteUrl, { cache: "no-store" });
  if (!res.ok) {
    return notFound();
  }
  const { job } = await res.json();
  if (!job) {
    return notFound();
  }

  const scoreDetails = job.scoreDetails;

  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Link href="/saved-jobs">
              <Button variant="ghost" className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Saved Jobs
              </Button>
            </Link>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-2xl">
                  <Percent className="mr-3 h-6 w-6 text-blue-600" />
                  Matching Score Details
                </CardTitle>
                <CardDescription>
                  For {job.title} at {job.company}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <p className="text-lg text-gray-600">Overall Match Score</p>
                  <p className="text-6xl font-bold text-blue-600">
                    {job.matchingScore}%
                  </p>
                </div>

                {scoreDetails ? (
                  <div className="space-y-4">
                    {/* Skills & Keywords */}
                    {scoreDetails.skillsAndKeywords && (
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="font-medium">Skills & Keywords</span>
                          <span className="text-gray-600">
                            {scoreDetails.skillsAndKeywords.score}/
                            {scoreDetails.skillsAndKeywords.weight}%
                          </span>
                        </div>
                        <Progress
                          value={
                            (scoreDetails.skillsAndKeywords.score /
                              scoreDetails.skillsAndKeywords.weight) *
                            100
                          }
                        />
                        {scoreDetails.skillsAndKeywords.breakdown && (
                          <div className="text-sm mt-2 space-y-1 text-gray-700 bg-gray-50 p-3 rounded-md">
                            <p><strong>Required Skills:</strong> {scoreDetails.skillsAndKeywords.breakdown.requiredSkills}</p>
                            <p><strong>Preferred Skills:</strong> {scoreDetails.skillsAndKeywords.breakdown.preferredSkills}</p>
                            <p><strong>Technology & Tools:</strong> {scoreDetails.skillsAndKeywords.breakdown.technologyAndTools}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Experience & Achievements */}
                    {scoreDetails.experienceAndAchievements && (
                       <div>
                        <div className="flex justify-between mb-1">
                          <span className="font-medium">Experience & Achievements</span>
                          <span className="text-gray-600">
                            {scoreDetails.experienceAndAchievements.score}/
                            {scoreDetails.experienceAndAchievements.weight}%
                          </span>
                        </div>
                        <Progress
                          value={
                            (scoreDetails.experienceAndAchievements.score /
                              scoreDetails.experienceAndAchievements.weight) *
                            100
                          }
                          className="[&>div]:bg-green-500"
                        />
                         {scoreDetails.experienceAndAchievements.breakdown && (
                          <div className="text-sm mt-2 space-y-1 text-gray-700 bg-gray-50 p-3 rounded-md">
                            <p><strong>Role Relevance:</strong> {scoreDetails.experienceAndAchievements.breakdown.roleRelevance}</p>
                            <p><strong>Years of Experience:</strong> {scoreDetails.experienceAndAchievements.breakdown.yearsOfExperience}</p>
                            <p><strong>Quantifiable Achievements:</strong> {scoreDetails.experienceAndAchievements.breakdown.quantifiableAchievements}</p>
                            <p><strong>Industry Relevance:</strong> {scoreDetails.experienceAndAchievements.breakdown.industryRelevance}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Education & Certifications */}
                     {scoreDetails.educationAndCertifications && (
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="font-medium">Education & Certifications</span>
                            <span className="text-gray-600">
                              {scoreDetails.educationAndCertifications.score}/
                              {scoreDetails.educationAndCertifications.weight}%
                            </span>
                          </div>
                          <Progress
                            value={
                              (scoreDetails.educationAndCertifications.score /
                                scoreDetails.educationAndCertifications.weight) *
                              100
                            }
                            className="[&>div]:bg-purple-500"
                          />
                          {scoreDetails.educationAndCertifications.rationale && (
                             <p className="text-sm mt-2 text-gray-700 bg-gray-50 p-3 rounded-md">
                               {scoreDetails.educationAndCertifications.rationale}
                            </p>
                          )}
                        </div>
                     )}

                    {/* Job Title & Seniority */}
                    {scoreDetails.jobTitleAndSeniority && (
                       <div>
                        <div className="flex justify-between mb-1">
                          <span className="font-medium">Job Title & Seniority</span>
                          <span className="text-gray-600">
                            {scoreDetails.jobTitleAndSeniority.score}/
                            {scoreDetails.jobTitleAndSeniority.weight}%
                          </span>
                        </div>
                        <Progress
                          value={
                            (scoreDetails.jobTitleAndSeniority.score /
                              scoreDetails.jobTitleAndSeniority.weight) *
                            100
                          }
                           className="[&>div]:bg-orange-500"
                        />
                         {scoreDetails.jobTitleAndSeniority.rationale && (
                             <p className="text-sm mt-2 text-gray-700 bg-gray-50 p-3 rounded-md">
                               {scoreDetails.jobTitleAndSeniority.rationale}
                            </p>
                          )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 bg-gray-50 p-4 rounded-md">
                    Detailed score breakdown is not available for this job.
                  </div>
                )}

                <div className="pt-4">
                  <h3 className="text-lg font-semibold mb-2">Summary</h3>
                  <div className="flex items-start gap-3 bg-gray-100 p-4 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-1" />
                    <p className="text-gray-800">{job.matchingSummary}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </AuthProvider>
  );
} 