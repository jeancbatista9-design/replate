import Foundation
import Vision
import ImageIO
let url=URL(fileURLWithPath:CommandLine.arguments[1])
let request=VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = false
request.recognitionLanguages = ["en-US"]
do {
 try VNImageRequestHandler(url:url,options:[:]).perform([request])
 let lines=(request.results ?? []).sorted{a,b in abs(a.boundingBox.midY-b.boundingBox.midY) > 0.012 ? a.boundingBox.midY > b.boundingBox.midY : a.boundingBox.minX < b.boundingBox.minX}.compactMap{$0.topCandidates(1).first?.string}
 print(lines.joined(separator:"\n"))
} catch {fputs("Unable to read this label image.\n",stderr);exit(1)}
