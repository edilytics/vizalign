# code copied from CRISPResso2 files: CRISPResso2/CRISPRessoCOREResources.pyx, CRISPResso2/CRISPResso2Align.pyx

import cython
import numpy as np
cimport numpy as np
import re


from cython.view cimport array as cvarray

from libc.stdlib cimport free, malloc

cimport cython
import sys
import os.path

cdef extern from "stdlib.h":
    ctypedef unsigned int size_t
    size_t strlen(char* s)

cdef extern from "Python.h":
    ctypedef void PyObject

ctypedef np.int_t DTYPE_INT
ctypedef np.uint_t DTYPE_UINT
ctypedef np.int8_t DTYPE_BOOL

cdef size_t UP = 1, LEFT = 2, DIAG = 3, NONE = 4
cdef size_t MARRAY = 1, IARRAY = 2, JARRAY = 3


cdef extern from "Python.h":
    ctypedef void PyObject
    int _PyBytes_Resize(PyObject **, size_t)
    char * PyBytes_AS_STRING(PyObject *)


re_find_indels = re.compile("(-*-)")

cdef char* get_c_string_with_length(size_t length):
    cdef char* c_string = <char *> malloc((length + 1) * sizeof(char))
    if not c_string:
        raise MemoryError()
    return c_string


def read_matrix(path=None):
    """
    Read a matrix in the NCBI format
    The score for a 'C' changing to an 'A' is stored in the matrix as:
        mat[ord('C'), ord('A')] = score
    """
    cdef np.ndarray[DTYPE_INT, ndim=2] a
    cdef size_t ai = 0, i
    cdef int v, mat_size

    if path is None:
        path = os.path.join(os.path.dirname(__file__), 'EDNAFULL')

    with open(path) as fh:
        headers = None
        while headers is None:
            line = fh.readline().strip()
            if line[0] == '#': continue
            headers = [ord(x) for x in line.split(' ') if x]
        mat_size = max(headers) + 1

        a = np.zeros((mat_size, mat_size), dtype=int)

        line = fh.readline()
        while line:
            line_vals = [int(x) for x in line[:-1].split(' ')[1:] if x]
            for ohidx, val in zip(headers, line_vals):
                a[headers[ai], ohidx] = val
            ai += 1
            line = fh.readline()

    return a

def make_matrix(match_score=5, mismatch_score=-4, n_mismatch_score=-2, n_match_score=-1):
    """
    Create a score matrix for matches/mismatches.
    The default values here are those represented in the EDNAFULL matrix

    match_score: score for matching nucleotide values
    mismatch_score: score for mismatching nucleotide values
    n_mismatch_score: score for matching a nucleotide with 'N'
    n_match_score: score for 'N' matching an 'N'
    """
    cdef np.ndarray[DTYPE_INT, ndim=2] a
    cdef size_t ai = 0, i
    cdef int v, mat_size

    letters = ['A','T','C','G','N']
    headers = [ord(x) for x in letters]
    mat_size = max(headers) + 1

    nuc_ords = [ord(x) for x in ['A','T','C','G']]

    a = np.zeros((mat_size, mat_size), dtype=int)

    for nuc in nuc_ords:
      for nuc2 in nuc_ords:
        if nuc == nuc2:
          a[nuc,nuc2] = match_score
        else:
          a[nuc,nuc2] = mismatch_score

    for nuc in nuc_ords:
      a[nuc,ord('N')] = n_mismatch_score
      a[ord('N'),nuc] = n_mismatch_score


    a[ord('N'),ord('N')] = n_match_score

    return a

@cython.boundscheck(False)
@cython.nonecheck(False)
def global_align(str pystr_seqj, str pystr_seqi, np.ndarray[DTYPE_INT, ndim=2] matrix,
          np.ndarray[DTYPE_INT,ndim=1] gap_incentive, int gap_open=-1,
          int gap_extend=-1):
    """
    Global sequence alignment (needleman-wunsch) on seq i and j.
    Reference is seq_i, sequenced read is seq_j
    Match and mismatch values are read from matrix object
    where matrix is of the format provided in the ncbi/data directory.
    gap_incentive is the incentive for having a gap at each position in seqi -
      this allows for the preferential location of gaps to be at the predicted
      cut site in genome editing experiments.

    """

    byte_seqj = pystr_seqj.encode('UTF-8')
    cdef char* seqj = byte_seqj
    byte_seqi = pystr_seqi.encode('UTF-8')
    cdef char* seqi = byte_seqi

    cdef size_t max_j = len(pystr_seqj)
    cdef size_t max_i = len(pystr_seqi)
    if len(gap_incentive) != max_i + 1:
        print('\nERROR: Mismatch in gap_incentive length (gap_incentive: ' + str(len(gap_incentive)) + ' ref: '+str(max_i+1) + '\n')
        return 0

    # need to initialize j for the case when it's a zero-length string.
    cdef size_t i = 0, j = 0, seqlen, align_counter = 0, p
    cdef int diag_score, up_score, left_score, tscore

    cdef str align_j
    cdef str align_i
    cdef char ci
    cdef char cj

    #create 3 arrays of scores and 3 arrays of pointers
    # M array - best alignment so far ending with a match
    # I array - best alignment so far ending with a gap in Read (J) (insertion in ref, deletion in read)
    # J array - best alignment so far ending with a gap in Ref (I) (deletion in ref, insertion in read)

    cdef int [:,:] mScore = np.empty((max_i + 1, max_j + 1), dtype=np.dtype("i"))
    cdef int [:,:] iScore = np.empty((max_i + 1, max_j + 1), dtype=np.dtype("i"))
    cdef int [:,:] jScore = np.empty((max_i + 1, max_j + 1), dtype=np.dtype("i"))
    cdef int [:,:] mPointer = np.empty((max_i + 1, max_j + 1), dtype=np.dtype("i"))
    cdef int [:,:] iPointer = np.empty((max_i + 1, max_j + 1), dtype=np.dtype("i"))
    cdef int [:,:] jPointer = np.empty((max_i + 1, max_j + 1), dtype=np.dtype("i"))


    cdef int min_score = gap_open * max_j * max_i

    #init match matrix
    mScore[0,1:] = min_score
    mScore[1:,0] = min_score
    mScore[0,0] = 0
    mPointer[0,1:] = IARRAY
    mPointer[1:,0] = JARRAY
    mPointer[0,0] = 0

# no penalty for gaps starting at beginning
#    score[0, 1:] = 0
#    score[1:, 0] = 0
# gap extension penalty for gaps starting at beginning
    #init i matrix
    for i in range(1,max_j+1):
        iScore[0,i] = gap_extend * i + gap_incentive[0]
#    iScore[0,1:] = [gap_extend * np.arange(1, max_j+1, dtype=int)]
    iScore[0:,0] = min_score
    iPointer[0,1:] = IARRAY

    #init j matrix
    for i in range(1,max_i+1):
        jScore[i,0] = gap_extend * i + gap_incentive[0]
    #jScore[1:,0] = np.vectorize(gap_extend * np.arange(1, max_i+1, dtype=int))
    jScore[0,0:] = min_score
    jPointer[1:,0] = JARRAY

#    print('gap penalty is'+str(gap_incentive))

    cdef int iFromMVal
    cdef int iExtendVal
    cdef int jFromMVal
    cdef int jExtendVal
    cdef int mVal, iVal, jVal

    #apply NW algorithm for inside squares (not last row or column)
    for i in range(1, max_i):
        ci = seqi[i - 1] #char in i

        for j in range(1, max_j):
            cj = seqj[j - 1] #char in j

            iFromMVal = gap_open + mScore[i, j - 1] + gap_incentive[i]
            iExtendVal = gap_extend + iScore[i, j - 1] + gap_incentive[i]
            if iFromMVal > iExtendVal:
                iScore[i,j] = iFromMVal
                iPointer[i,j] = MARRAY
            else:
                iScore[i,j] = iExtendVal
                iPointer[i,j] = IARRAY

            jFromMVal = gap_open + mScore[i - 1, j] + gap_incentive[i-1]
	    #no gap incentive here -- J already got the gap incentive when it transitioned from M, so don't add it again if we're extending.
            jExtendVal = gap_extend + jScore[i - 1, j]
            if jFromMVal > jExtendVal:
                jScore[i,j] =  jFromMVal
                jPointer[i,j] = MARRAY
            else:
                jScore[i,j] = jExtendVal
                jPointer[i,j] = JARRAY

            mVal = mScore[i - 1, j - 1] + matrix[ci,cj]
            iVal = iScore[i - 1, j - 1] + matrix[ci,cj]
            jVal = jScore[i - 1, j - 1] + matrix[ci,cj]
            if mVal > jVal:
                if mVal > iVal:
                    mScore[i, j] = mVal
                    mPointer[i, j] = MARRAY
                else:
                    mScore[i, j]   = iVal
                    mPointer[i, j] = IARRAY
            else:
                if jVal > iVal:
                    mScore[i, j]  = jVal
                    mPointer[i, j] = JARRAY
                else:
                    mScore[i, j] = iVal
                    mPointer[i, j] = IARRAY

#            print('mScore['+str(i) + ',' + str(j) +']: ' + str(mScore[i,j]) + ': max(' + str(mScore[i - 1, j - 1])+ '+ (' + str(ci)+ ',' + str(cj) + ') ' + str(matrix[ci,cj]) + ', i:'+str(iVal) + ',j:' + str(jVal))

    #for last column and last row, ignore gap opening penalty
    #last column
    j = max_j
    cj = seqj[j-1]
    for i in range(1, max_i):
        ci = seqi[i-1]

        iFromMVal = gap_extend + mScore[i, j - 1] + gap_incentive[i]
        iExtendVal = gap_extend + iScore[i, j - 1] + gap_incentive[i]
        if iFromMVal > iExtendVal:
            iScore[i,j] =  iFromMVal
            iPointer[i,j] = MARRAY
        else:
            iScore[i,j] = iExtendVal
            iPointer[i,j] = IARRAY

        jFromMVal = gap_extend + mScore[i - 1, j] + gap_incentive[i-1]
        jExtendVal = gap_extend + jScore[i - 1, j]
        if jFromMVal > jExtendVal:
            jScore[i,j] =  jFromMVal
            jPointer[i,j] = MARRAY
        else:
            jScore[i,j] = jExtendVal
            jPointer[i,j] = JARRAY

        mVal = mScore[i - 1, j - 1] + matrix[ci,cj]
        iVal = iScore[i - 1, j - 1] + matrix[ci,cj]
        jVal = jScore[i - 1, j - 1] + matrix[ci,cj]
        if mVal > jVal:
            if mVal > iVal:
                mScore[i, j] = mVal
                mPointer[i, j] = MARRAY
            else:
                mScore[i, j]   = iVal
                mPointer[i, j] = IARRAY
        else:
            if jVal > iVal:
                mScore[i, j]  = jVal
                mPointer[i, j] = JARRAY
            else:
                mScore[i, j] = iVal
                mPointer[i, j] = IARRAY
#        print('lastCol: mScore['+str(i) + ',' + str(j) +']: ' + str(mScore[i,j]) + ': max(' + str(mScore[i - 1, j - 1])+ '+ (' + str(ci)+ ',' + str(cj) + ') ' + str(matrix[ci,cj]) + ', i:'+str(iVal) + ',j:' + str(jVal))

    #last row
    i = max_i
    ci = seqi[i - 1]
    for j in range(1, max_j+1):
        cj = seqj[j - 1]

        iFromMVal = gap_extend + mScore[i, j - 1] + gap_incentive[i]
        iExtendVal = gap_extend + iScore[i, j - 1] + gap_incentive[i]
        if iFromMVal > iExtendVal:
            iScore[i,j] =  iFromMVal
            iPointer[i,j] = MARRAY
        else:
            iScore[i,j] = iExtendVal
            iPointer[i,j] = IARRAY

        jFromMVal = gap_extend + mScore[i - 1, j] + gap_incentive[i-1]
        jExtendVal = gap_extend + jScore[i - 1, j]
        if jFromMVal > jExtendVal:
            jScore[i,j] =  jFromMVal
            jPointer[i,j] = MARRAY
        else:
            jScore[i,j] = jExtendVal
            jPointer[i,j] = JARRAY


        mVal = mScore[i - 1, j - 1] + matrix[ci,cj]
        iVal = iScore[i - 1, j - 1] + matrix[ci,cj]
        jVal = jScore[i - 1, j - 1] + matrix[ci,cj]
        if mVal > jVal:
            if mVal > iVal:
                mScore[i, j] = mVal
                mPointer[i, j] = MARRAY
            else:
                mScore[i, j]   = iVal
                mPointer[i, j] = IARRAY
        else:
            if jVal > iVal:
                mScore[i, j]  = jVal
                mPointer[i, j] = JARRAY
            else:
                mScore[i, j] = iVal
                mPointer[i, j] = IARRAY
#        print('lastRow: mScore['+str(i) + ',' + str(j) +']: ' + str(mScore[i,j]) + ': max(' + str(mScore[i - 1, j - 1])+ '+ (' + str(ci)+ ',' + str(cj) + ') ' + str(matrix[ci,cj]) + ', i:'+str(iVal) + ',j:' + str(jVal))



#    print('mScore')
#    for ii in range(mScore.shape[0]):
#      for jj in range(mScore.shape[1]):
#        print(str(mScore[ii,jj]) + '.' + str(mPointer[ii,jj])+ ","),
#      print("\n"),
#    print('iScore')
#    for ii in range(iScore.shape[0]):
#      for jj in range(iScore.shape[1]):
#        print(str(iScore[ii,jj]) + '.' + str(iPointer[ii,jj])+ ","),
#      print("\n"),
#    print('jScore')
#    for ii in range(jScore.shape[0]):
#      for jj in range(jScore.shape[1]):
#        print(str(jScore[ii,jj]) + '.' + str(jPointer[ii,jj])+ ","),
#      print("\n"),

    seqlen = max_i + max_j
    cdef char* tmp_align_j = get_c_string_with_length(seqlen)
    cdef char* tmp_align_i = get_c_string_with_length(seqlen)

    cdef int matchCount = 0
    i = max_i
    j = max_j
    ci = seqi[i - 1]
    cj = seqj[j - 1]
    cdef int currMatrix
    currMatrix = MARRAY
    if mScore[i,j] > jScore[i,j]:
        if mScore[i,j] > iScore[i,j]:
            currMatrix = MARRAY
        else:
            currMatrix = IARRAY
    else:
        if jScore[i,j] > iScore[i,j]:
            currMatrix = JARRAY
        else:
            currMatrix = IARRAY
#    print('seqi' + str(seqi))
#    print('seqj' + str(seqj))
    while i > 0 or j > 0:
        # print("i: " + str(i) + " j: " + str(j) + " currMatrix: " + str(currMatrix) + " match score: " + str(mScore[i,j]) + " last match: " +  str(mScore[i-1,j-1]) + " matrix[" + str(ci) + "," + str(cj) + "]: " + str(matrix[ci,cj]) + " last j " + str(jScore[i,j]) + " last i: " + str(iScore[i,j]) + " mpointer: " + str(mPointer[i,j]) + " ipointer: " + str(iPointer[i,j]) + " jpointer: " + str(jPointer[i,j]))

        currVal = mScore[i,j]
        currPtr = mPointer[i,j]
        if currMatrix == IARRAY:
            currVal = iScore[i,j]
            currPtr = iPointer[i,j]
        if currMatrix == JARRAY:
            currVal = jScore[i,j]
            currPtr = jPointer[i,j]
#        print("i: " + str(i) + " j: " + str(j) + " " + str(currMatrix) +':' + str(currVal) + ' > ' + str(currPtr))
        if currMatrix == MARRAY: # 1
            currMatrix = mPointer[i,j]
            tmp_align_j[align_counter] = cj
            tmp_align_i[align_counter] = ci
            if cj == ci:
                matchCount += 1

            if i > 1:
                i -= 1
                ci = seqi[i - 1]
            else:
                i = 0
                ci = seqi[i]
            if j > 1:
                j -= 1
                cj = seqj[j - 1]
            else:
                j = 0
                cj = seqj[j]

#            print('in M set to ' + str(currMatrix))
        elif currMatrix == JARRAY: # 3
            currMatrix = jPointer[i,j]
            tmp_align_j[align_counter] = c"-"
            tmp_align_i[align_counter] = ci
            if i > 1:
                i -= 1
                ci = seqi[i - 1]
            else:
                i = 0
                ci = seqi[i]
        elif currMatrix == IARRAY: # 2
            currMatrix = iPointer[i,j]
            tmp_align_j[align_counter] = cj
            tmp_align_i[align_counter] = c"-"
            if j > 1:
                j -= 1
                cj = seqj[j - 1]
            else:
                j = 0
                cj = seqj[j]
        else:
            print('i: ' + str(i) + ' j: ' + str(j))
            print('currMatrix:' + str(currMatrix))
            print('seqj: ' + str(seqj) + ' seqi: ' + str(seqi))
            raise Exception('wtf4!:pointer: %i', i)
#          print('at end, currMatrix is ' + str(currMatrix))

        align_counter += 1
    try:
        align_j = tmp_align_j[:align_counter].decode('UTF-8', 'strict')
    finally:
        free(tmp_align_j)
    try:
        align_i = tmp_align_i[:align_counter].decode('UTF-8', 'strict')
    finally:
        free(tmp_align_i)

    # print(tounicode_with_length_and_free(alig))
#    print(str(matchCount) + " aln: " + str(align_counter))
    final_score = 100*matchCount/float(align_counter)
    return align_j[::-1], align_i[::-1], round(final_score, 3)


class ResultsSlotsDict():
    __slots__ = (
        'all_insertion_positions',
        'all_insertion_left_positions',
        'insertion_positions',
        'insertion_coordinates',
        'insertion_sizes',
        'insertion_n',
        'all_deletion_positions',
        'all_deletion_coordinates',
        'deletion_positions',
        'deletion_coordinates',
        'deletion_sizes',
        'deletion_n',
        'all_substitution_positions',
        'substitution_positions',
        'all_substitution_values',
        'substitution_values',
        'substitution_n',
        'ref_positions',
        'ref_name',
        'aln_scores',
        'classification',
        'aln_seq',
        'aln_ref',
        'aln_strand',
        'irregular_ends',
        'insertions_outside_window',
        'deletions_outside_window',
        'substitutions_outside_window',
        'total_mods',
        'mods_in_window',
        'mods_outside_window',
    )

    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)

    def __getitem__(self, key):
        return getattr(self, key)

    def __setitem__(self, key, value):
        setattr(self, key, value)


@cython.boundscheck(False)
@cython.nonecheck(False)
@cython.wraparound(False)
def find_indels_substitutions(read_seq_al, ref_seq_al, _include_indx):

    #ref_positions holds the indices for which positions map back to the original reference
    # for example,
    #     1 2 3 4 5 6 7 8
    # ref A A T T G G C C
    #
    # and for a given alignment
    # ref A A T T - G G C C
    # aln A - T T T G G C C
    #     1 2 3 4-4 5 6 7 8 <ref positions. Note that the negative values/indices represent places that don't map back to the original reference
    ref_positions=[]
    all_substitution_positions=[]
    substitution_positions=[]
    all_substitution_values=[]
    substitution_values=[]

    all_deletion_positions = []
    all_deletion_coordinates = []
    deletion_positions = []
    deletion_coordinates = []
    deletion_sizes = []
    cdef int start_deletion = -1  # the -1 value indicates that there currently isn't a deletion

    all_insertion_positions = []
    all_insertion_left_positions = []
    insertion_positions = []
    insertion_coordinates = []
    insertion_sizes = []
    cdef int start_insertion = -1  # the -1 value indicates that there currently isn't an insertion

    cdef size_t seq_len = len(ref_seq_al)
    include_indx_set = set(_include_indx)
    nucSet = set(['A', 'T', 'C', 'G', 'N'])
    cdef int idx = 0
    cdef int idx_c
    cdef int current_insertion_size = 0
    for idx_c, c in enumerate(ref_seq_al):
        if c != '-':
            ref_positions.append(idx)
            if ref_seq_al[idx_c]!=read_seq_al[idx_c] and read_seq_al[idx_c] != '-' and read_seq_al[idx_c] != 'N':
                all_substitution_positions.append(idx)
                all_substitution_values.append(read_seq_al[idx_c])
                if idx in _include_indx:
                    substitution_positions.append(idx)
                    substitution_values.append(read_seq_al[idx_c])
            if start_insertion != -1:  # this is the end of an insertion
                all_insertion_left_positions.append(start_insertion)
                all_insertion_positions.append(start_insertion)
                all_insertion_positions.append(idx)
                if start_insertion in include_indx_set and idx in include_indx_set:
                    insertion_coordinates.append((start_insertion, idx))
                    insertion_positions.append(start_insertion)
                    insertion_positions.append(idx)
                    insertion_sizes.append(current_insertion_size)
                start_insertion = -1
            current_insertion_size = 0
            idx += 1
        else:  # the current ref position is -
            if idx == 0:
                ref_positions.append(-1)
            else:
                ref_positions.append(-idx)
            if idx > 0 and start_insertion == -1:  # this is the first index of an insertion
                start_insertion = idx - 1
            current_insertion_size += 1

        if read_seq_al[idx_c] == '-' and start_deletion == -1:  # this is the first part of a deletion
            if idx_c - 1 > 0:
                start_deletion = ref_positions[idx_c]
            else:
                start_deletion = 0
        elif read_seq_al[idx_c] != '-' and start_deletion != -1:  # this is the end of a deletion
            end_deletion = ref_positions[idx_c]
            all_deletion_positions.extend(range(start_deletion, end_deletion))
            all_deletion_coordinates.append((start_deletion, end_deletion))
            if include_indx_set.intersection(range(start_deletion, end_deletion)):
                deletion_positions.extend(range(start_deletion, end_deletion))
                deletion_coordinates.append((start_deletion, end_deletion))
                deletion_sizes.append(end_deletion - start_deletion)
            start_deletion = -1

    if start_deletion != -1:
        end_deletion = ref_positions[seq_len - 1]
        all_deletion_positions.extend(range(start_deletion, end_deletion))
        all_deletion_coordinates.append((start_deletion, end_deletion))
        if include_indx_set.intersection(range(start_deletion, end_deletion)):
            deletion_positions.extend(range(start_deletion, end_deletion))
            deletion_coordinates.append((start_deletion, end_deletion))
            deletion_sizes.append(end_deletion - start_deletion)

    cdef size_t substitution_n = len(substitution_positions)
    cdef size_t deletion_n = sum(deletion_sizes)
    cdef size_t insertion_n = sum(insertion_sizes)

    return ResultsSlotsDict(
        all_insertion_positions=all_insertion_positions,
        all_insertion_left_positions=all_insertion_left_positions,
        insertion_positions=insertion_positions,
        insertion_coordinates=insertion_coordinates,
        insertion_sizes=insertion_sizes,
        insertion_n=insertion_n,

        all_deletion_positions=all_deletion_positions,
        all_deletion_coordinates=all_deletion_coordinates,
        deletion_positions=deletion_positions,
        deletion_coordinates=deletion_coordinates,
        deletion_sizes=deletion_sizes,
        deletion_n=deletion_n,

        all_substitution_positions=all_substitution_positions,
        substitution_positions=substitution_positions,
        all_substitution_values=np.array(all_substitution_values),
        substitution_values=np.array(substitution_values),
        substitution_n=substitution_n,

        ref_positions=ref_positions,
    )


def calculate_homology(a, b):
    cdef char *al = a
    cdef char *bl = b
    cdef size_t l = strlen(al)
    cdef float score = 0.0

    for i in range(l):
        if al[i] == bl[i]:
            score+=1
    return score/l
